import { Injectable, BadRequestException, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../lib/supabase.service';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';

@Injectable()
export class ActividadService {
  constructor(private supabaseService: SupabaseService) {}

  private async verificarEsProfesor(claseId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);
    const { data: inscripcion, error } = await supabase
      .from('inscripcion')
      .select('is_profesor')
      .eq('usuario_id', userId)
      .eq('clase_id', claseId)
      .maybeSingle();

    if (error || !inscripcion || !inscripcion.is_profesor) {
      throw new ForbiddenException('No tienes permisos de profesor en esta clase');
    }
    return inscripcion;
  }

  async createActividad(claseId: string, dto: CreateActividadDto, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    // Validaciones
    if (!dto.nombre || !dto.descripcion) {
      throw new BadRequestException('Nombre y descripción son obligatorios');
    }

    if (dto.tipo === 'evaluacion') {
      if (!dto.fechaInicio || !dto.fechaFin) {
        throw new BadRequestException('Las actividades de evaluación requieren fechaInicio y fechaFin');
      }
    }

    // Solo profesor
    await this.verificarEsProfesor(claseId, userId, accessToken);

    try {
      const { data: actividad, error: insertError } = await supabase
        .from('actividad')
        .insert({
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          tipo: dto.tipo || 'practica',
          fecha_inicio: dto.fechaInicio || null,
          fecha_fin: dto.fechaFin || null,
          is_visible: dto.isVisible === true,
          clase_id: claseId,
          creado_por: userId,
        })
        .select()
        .single();

      if (insertError) {
        throw new BadRequestException('Error al crear actividad: ' + insertError.message);
      }

      const actividadId = actividad.id;

      // Crear ejercicios nuevos si vienen
      const createdEjercicioIds: string[] = [];
      if (dto.nuevosEjercicios && dto.nuevosEjercicios.length > 0) {
        for (const e of dto.nuevosEjercicios) {
          const metadataObj: any = {};
          try {
            if ((e as any).metadata) Object.assign(metadataObj, JSON.parse((e as any).metadata));
          } catch (err) {
            // metadata may already be object or invalid JSON; ignore parse errors
            if ((e as any).metadata && typeof (e as any).metadata === 'object') Object.assign(metadataObj, (e as any).metadata);
          }
          if ((e as any).titulo) metadataObj.title = (e as any).titulo;
          const payload: any = { enunciado: (e as any).enunciado || (e as any).titulo || '', puntos: (e as any).puntos ?? 1, metadata: Object.keys(metadataObj).length ? metadataObj : null, creado_por: userId };
          const { data: ej, error: ejError } = await supabase.from('ejercicio').insert(payload).select().single();
          if (ejError) {
            throw new BadRequestException('Error al crear ejercicio: ' + ejError.message);
          }
          createdEjercicioIds.push(ej.id);

          // Si vienen opciones (estructura para MCQ), insertarlas
          if ((e as any).opciones && Array.isArray((e as any).opciones) && (e as any).opciones.length > 0) {
            const opcionesRows = (e as any).opciones.map((o: any) => ({ ejercicio_id: ej.id, texto: o.texto, is_correcta: !!o.is_correcta }));
            const { error: optError } = await supabase.from('opcion_ejercicio').insert(opcionesRows);
            if (optError) {
              throw new BadRequestException('Error al crear opciones de ejercicio: ' + optError.message);
            }
          }
        }
      }

      // Validar que los ejercicioIds provistos pertenezcan a la clase
      const providedIds = dto.ejercicioIds || [];
      if (providedIds.length > 0) {
        // obtener usuarios inscritos
        const { data: inscritos } = await supabase.from('inscripcion').select('usuario_id').eq('clase_id', claseId);
        const usuarioIds = (inscritos || []).map((i: any) => i.usuario_id);

        // ejercicios válidos si: estan en actividad_ejercicio con actividad.clase_id OR fueron creados por usuarios inscritos
        const { data: asociados } = await supabase
          .from('actividad_ejercicio')
          .select('ejercicio_id, actividad:actividad_id (clase_id)')
          .in('ejercicio_id', providedIds as any[]);

        const asociadosIds = new Set((asociados || []).filter((r: any) => r.actividad && r.actividad.clase_id === claseId).map((r: any) => r.ejercicio_id));

        const { data: creadosPorInscritos } = await supabase
          .from('ejercicio')
          .select('id')
          .in('id', providedIds as any[])
          .in('creado_por', usuarioIds as any[]);

        const creadosIds = new Set((creadosPorInscritos || []).map((r: any) => r.id));

        const validIds = new Set([...Array.from(asociadosIds), ...Array.from(creadosIds)]);

        const invalids = providedIds.filter((id) => !validIds.has(id));
        if (invalids.length > 0) {
          throw new BadRequestException('Algunos ejercicios no pertenecen a esta clase: ' + invalids.join(', '));
        }
      }

      const allEjercicioIds = [...providedIds, ...createdEjercicioIds];

      // Asociar ejercicios
      if (allEjercicioIds.length > 0) {
        const rows = allEjercicioIds.map((eid) => ({ actividad_id: actividadId, ejercicio_id: eid }));
        const { error: assocError } = await supabase.from('actividad_ejercicio').insert(rows);
        if (assocError) {
          throw new BadRequestException('Error al asociar ejercicios: ' + assocError.message);
        }
      }

      return { message: 'Actividad creada', actividad };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException('Error al crear actividad');
    }
  }

  async getActividades(claseId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    // Verificar que el usuario esté inscrito
    const { data: insc } = await supabase
      .from('inscripcion')
      .select('is_profesor')
      .eq('usuario_id', userId)
      .eq('clase_id', claseId)
      .maybeSingle();

    if (!insc) {
      throw new ForbiddenException('No tienes acceso a esta clase');
    }

    // For non-professors (students), only return activities visible to them
    const query = supabase
      .from('actividad')
      .select('*')
      .eq('clase_id', claseId)
      .order('created_at', { ascending: false });

    if (!insc.is_profesor) {
      query.eq('is_visible', true);
    }

    const { data: actividades, error } = await query;

    if (error) {
      const msg = error?.message || 'Error al obtener actividades';
      throw new BadRequestException('Error al obtener actividades: ' + msg);
    }

    // Para cada actividad obtener ejercicios asociados
    const actividadConEjercicios: any[] = [];
    for (const a of actividades) {
      const { data: ae } = await supabase
        .from('actividad_ejercicio')
        .select('ejercicio:ejercicio_id (id, enunciado, puntos, metadata, creado_por, creado_at)')
        .eq('actividad_id', a.id);

      actividadConEjercicios.push({ ...a, ejercicios: ae?.map((r: any) => r.ejercicio) || [] });
    }

    return { actividades: actividadConEjercicios };
  }

  async deleteActividad(claseId: string, actividadId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    // Verificar profesor
    await this.verificarEsProfesor(claseId, userId, accessToken);

    try {
      // Borrar registros de alumnos relacionados
      await supabase.from('actividad_resultado').delete().eq('actividad_id', actividadId);

      // Borrar asociaciones actividad_ejercicio
      await supabase.from('actividad_ejercicio').delete().eq('actividad_id', actividadId);

      // Borrar la actividad
      const { error } = await supabase.from('actividad').delete().eq('id', actividadId).eq('clase_id', claseId);
      if (error) {
        throw new BadRequestException('Error al eliminar actividad: ' + error.message);
      }

      return { message: 'Actividad eliminada' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Error al eliminar actividad');
    }
  }

  async updateActividad(claseId: string, actividadId: string, dto: UpdateActividadDto, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    await this.verificarEsProfesor(claseId, userId, accessToken);

    // validar fechas si tipo evaluacion (no hay tipo en update DTO, so check fecha presence)
    if ((dto.fechaInicio && !dto.fechaFin) || (!dto.fechaInicio && dto.fechaFin)) {
      throw new BadRequestException('Debe proporcionar ambas fechas (fechaInicio y fechaFin) al actualizar si una de ellas está presente');
    }

    try {
      // Actualizar campos de actividad
      const updatePayload: any = {};
      if (dto.nombre !== undefined) updatePayload.nombre = dto.nombre;
      if (dto.descripcion !== undefined) updatePayload.descripcion = dto.descripcion;
      if (dto.fechaInicio !== undefined) updatePayload.fecha_inicio = dto.fechaInicio;
      if (dto.fechaFin !== undefined) updatePayload.fecha_fin = dto.fechaFin;
      if (dto.isVisible !== undefined) updatePayload.is_visible = dto.isVisible;

      if (Object.keys(updatePayload).length > 0) {
        const { error: updateError } = await supabase.from('actividad').update(updatePayload).eq('id', actividadId).eq('clase_id', claseId);
        if (updateError) throw new BadRequestException('Error al actualizar actividad: ' + updateError.message);
      }

      // Si vienen ejercicioIds, reemplazar asociaciones
      if (dto.ejercicioIds && Array.isArray(dto.ejercicioIds)) {
        // validar que pertenecen a la misma clase
        const { data: inscritos } = await supabase.from('inscripcion').select('usuario_id').eq('clase_id', claseId);
        const usuarioIds = (inscritos || []).map((i: any) => i.usuario_id);

        const { data: asociados } = await supabase
          .from('actividad_ejercicio')
          .select('ejercicio_id, actividad:actividad_id (clase_id)')
          .in('ejercicio_id', dto.ejercicioIds as any[]);
        const asociadosIds = new Set((asociados || []).filter((r: any) => r.actividad && r.actividad.clase_id === claseId).map((r: any) => r.ejercicio_id));

        const { data: creadosPorInscritos } = await supabase
          .from('ejercicio')
          .select('id')
          .in('id', dto.ejercicioIds as any[])
          .in('creado_por', usuarioIds as any[]);

        const creadosIds = new Set((creadosPorInscritos || []).map((r: any) => r.id));

        const validIds = new Set([...Array.from(asociadosIds), ...Array.from(creadosIds)]);
        const invalids = dto.ejercicioIds.filter((id) => !validIds.has(id));
        if (invalids.length > 0) throw new BadRequestException('Algunos ejercicios no pertenecen a esta clase: ' + invalids.join(', '));

        // eliminar asociaciones previas
        const { error: delError } = await supabase.from('actividad_ejercicio').delete().eq('actividad_id', actividadId);
        if (delError) throw new BadRequestException('Error al eliminar relaciones previas: ' + delError.message);

        if (dto.ejercicioIds.length > 0) {
          const rows = dto.ejercicioIds.map((eid) => ({ actividad_id: actividadId, ejercicio_id: eid }));
          const { error: insertError } = await supabase.from('actividad_ejercicio').insert(rows);
          if (insertError) throw new BadRequestException('Error al asociar ejercicios: ' + insertError.message);
        }
      }

      const { data: actividad, error } = await supabase.from('actividad').select('*').eq('id', actividadId).single();
      if (error) throw new BadRequestException('No fue posible recuperar actividad: ' + error.message);
      return { message: 'Actividad actualizada', actividad };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException('Error al actualizar actividad');
    }
  }

  async getEjerciciosDeClase(claseId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    // Verificar inscripción
    const { data: insc } = await supabase
      .from('inscripcion')
      .select('id')
      .eq('usuario_id', userId)
      .eq('clase_id', claseId)
      .maybeSingle();

    if (!insc) {
      throw new ForbiddenException('No tienes acceso a esta clase');
    }

    // Strategy:
    // 1) Obtener ejercicios asociados a actividades de la clase (actividad_ejercicio -> actividad.clase_id)
    // 2) Obtener ejercicios creados por usuarios inscritos en la clase (ejercicio.creado_por in inscripcion.usuario_id)
    // 3) Unir resultados y devolver con sus opciones

    // 1) obtener ids de actividades de la clase
    const { data: actividades, error: actErr } = await supabase.from('actividad').select('id').eq('clase_id', claseId);
    if (actErr) throw new BadRequestException('Error al obtener actividades: ' + (actErr?.message || ''));

    const actividadIds = (actividades || []).map((a: any) => a.id);

    const ejerciciosMap: Record<string, any> = {};

    if (actividadIds.length > 0) {
      const { data: aeList, error: aeErr } = await supabase
        .from('actividad_ejercicio')
        .select('ejercicio:ejercicio_id (id, enunciado, puntos, metadata, creado_por, creado_at)')
        .in('actividad_id', actividadIds as any[]);
      if (aeErr) throw new BadRequestException('Error al obtener ejercicios desde actividades: ' + (aeErr?.message || ''));

      for (const row of (aeList || []) as any[]) {
        const ej = (row as any).ejercicio;
        if (ej && (ej as any).id) ejerciciosMap[(ej as any).id] = ej;
      }
    }

    // 2) ejercicios creados por usuarios inscritos en la clase
    const { data: inscritos, error: insErr } = await supabase.from('inscripcion').select('usuario_id').eq('clase_id', claseId);
    if (insErr) throw new BadRequestException('Error al obtener inscritos: ' + (insErr?.message || ''));

    const usuarioIds = (inscritos || []).map((i: any) => i.usuario_id);
    if (usuarioIds.length > 0) {
      const { data: creados, error: creadosErr } = await supabase
        .from('ejercicio')
        .select('id, enunciado, puntos, metadata, creado_por, creado_at')
        .in('creado_por', usuarioIds)
        .order('creado_at', { ascending: false });
      if (creadosErr) throw new BadRequestException('Error al obtener ejercicios creados por inscritos: ' + (creadosErr?.message || ''));

      for (const ej of creados || []) {
        ejerciciosMap[ej.id] = ejerciciosMap[ej.id] || ej;
      }
    }

    const ejercicios = Object.values(ejerciciosMap);

    // 3) para cada ejercicio obtener sus opciones
    const ejerciciosConOpciones: any[] = [];
    for (const ej of ejercicios) {
      const { data: opciones, error: optErr } = await supabase
        .from('opcion_ejercicio')
        .select('*')
        .eq('ejercicio_id', ej.id);

      if (optErr) throw new BadRequestException('Error al obtener opciones: ' + (optErr?.message || ''));

      ejerciciosConOpciones.push({ ...ej, opciones: opciones || [] });
    }

    return { ejercicios: ejerciciosConOpciones };
  }
}
