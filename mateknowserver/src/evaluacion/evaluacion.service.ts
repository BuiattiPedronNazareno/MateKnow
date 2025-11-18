import { Injectable, BadRequestException, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../lib/supabase.service';
import { IniciarIntentoResponse } from './dto/iniciar-intento.dto';
import { RespuestaParcialDto } from './dto/respuesta-parcial.dto';
import { FinalizarIntentoDto } from './dto/finalizar-intento.dto';

@Injectable()
export class EvaluacionService {
  constructor(private supabaseService: SupabaseService) {}

  private async verificarInscripto(claseId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);
    const { data: insc, error } = await supabase
      .from('inscripcion')
      .select('*')
      .eq('clase_id', claseId)
      .eq('usuario_id', userId)
      .maybeSingle();

    if (error || !insc) throw new ForbiddenException('No estás inscrito en esta clase');
    return insc;
  }

  async iniciarIntento(claseId: string, actividadId: string, userId: string, accessToken?: string): Promise<IniciarIntentoResponse> {
    const supabase = this.supabaseService.getClient(accessToken);

    // Verificar inscripción
    await this.verificarInscripto(claseId, userId, accessToken);

    // Obtener actividad
    const { data: actividad, error: actErr } = await supabase
      .from('actividad')
      .select('*')
      .eq('id', actividadId)
      .eq('clase_id', claseId)
      .maybeSingle();

    if (actErr || !actividad) throw new NotFoundException('Actividad no encontrada');

    if (actividad.tipo !== 'evaluacion') throw new BadRequestException('Solo actividades de tipo evaluación se pueden iniciar');

    const ahora = new Date();
    const fechaInicio = actividad.fecha_inicio ? new Date(actividad.fecha_inicio) : null;
    const fechaFin = actividad.fecha_fin ? new Date(actividad.fecha_fin) : null;

    if (fechaInicio && ahora < fechaInicio) throw new BadRequestException('La evaluación no ha comenzado');
    if (fechaFin && ahora > fechaFin) throw new BadRequestException('La evaluación ya finalizó');

    // Crear registro de intento
    const { data: registro, error: regErr } = await supabase
      .from('actividad_resultado')
      .insert({ actividad_id: actividadId, usuario_id: userId, respuestas: {}, estado: 'in_progress', started_at: ahora.toISOString() })
      .select()
      .single();

    if (regErr) throw new InternalServerErrorException('Error al crear intento: ' + regErr.message);

    return { registroId: registro.id, fechaFin: actividad.fecha_fin };
  }

  async guardarRespuestas(dto: RespuestaParcialDto, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    // Obtener registro y validar propietario
    const { data: registro, error: regErr } = await supabase
      .from('actividad_resultado')
      .select('*')
      .eq('id', dto.registroId)
      .maybeSingle();

    if (regErr || !registro) throw new NotFoundException('Registro no encontrado');
    if (registro.usuario_id !== userId) throw new ForbiddenException('No puedes modificar este intento');
    if (registro.estado === 'finished') throw new BadRequestException('El intento ya fue finalizado');

    // Merge respuestas
    const existentes = registro.respuestas || {};
    const merged = { ...existentes, ...dto.respuestas };

    const { error: upErr } = await supabase
      .from('actividad_resultado')
      .update({ respuestas: merged, updated_at: new Date().toISOString() })
      .eq('id', dto.registroId);

    if (upErr) throw new InternalServerErrorException('Error al guardar respuestas: ' + upErr.message);

    return { message: 'Guardado' };
  }

  async finalizarIntento(dto: FinalizarIntentoDto, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    // Obtener registro
    const { data: registro, error: regErr } = await supabase
      .from('actividad_resultado')
      .select('*')
      .eq('id', dto.registroId)
      .maybeSingle();

    if (regErr || !registro) throw new NotFoundException('Registro no encontrado');
    if (registro.usuario_id !== userId) throw new ForbiddenException('No puedes finalizar este intento');
    if (registro.estado === 'finished') throw new BadRequestException('Intento ya finalizado');

    // Obtener ejercicios asociados
    const { data: ae, error: aeErr } = await supabase
      .from('actividad_ejercicio')
      .select('ejercicio:ejercicio_id (id, enunciado), ejercicio:ejercicio_id -> opciones: option (*)')
      .eq('actividad_id', registro.actividad_id);

    // Nota: Su estructura depende de cómo estén las tablas; si no se puede obtener opciones así, haremos otra consulta.
    if (aeErr) throw new InternalServerErrorException('Error al obtener ejercicios: ' + aeErr.message);

    // Obtener todas las opciones correctas por ejercicio
    const { data: opciones, error: optErr } = await supabase
      .from('opcion_ejercicio')
      .select('*');

    if (optErr) throw new InternalServerErrorException('Error al obtener opciones: ' + optErr.message);

    // Calcular puntaje simple: 1 punto por respuesta correcta (ajustar si hay pesos)
    const respuestas: Record<string, any> = registro.respuestas || {};
    let puntaje = 0;

    // opciones: cada fila tiene ejercicio_id y is_correcta etc.
    const opcionesPorEjercicio: Record<string, any[]> = {};
    (opciones || []).forEach((o: any) => {
      opcionesPorEjercicio[o.ejercicio_id] = opcionesPorEjercicio[o.ejercicio_id] || [];
      opcionesPorEjercicio[o.ejercicio_id].push(o);
    });

    for (const ejercicioId of Object.keys(respuestas)) {
      const resp = respuestas[ejercicioId];
      const opcionesEj = opcionesPorEjercicio[ejercicioId] || [];
      // si respuesta es optionId simple
      const correcta = opcionesEj.find((o: any) => o.id === resp && o.is_correcta);
      if (correcta) puntaje += 1;
    }

    // Actualizar registro
    const { error: finishErr } = await supabase
      .from('actividad_resultado')
      .update({ estado: 'finished', puntaje: puntaje, finished_at: new Date().toISOString() })
      .eq('id', dto.registroId);

    if (finishErr) throw new InternalServerErrorException('Error al finalizar intento: ' + finishErr.message);

    return { puntaje };
  }

  async getHistorial(claseId: string, actividadId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    const { data, error } = await supabase
      .from('actividad_resultado')
      .select('*')
      .eq('actividad_id', actividadId)
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new InternalServerErrorException('Error al obtener historial: ' + error.message);

    return { historial: data };
  }
}
