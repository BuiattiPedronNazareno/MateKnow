import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../lib/supabase.service';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';
import { RespuestaParcialDto } from './dto/respuesta-parcial.dto';
import { FinalizarIntentoDto } from './dto/finalizar-intento.dto';
import { RankingGateway } from './ranking.gateway';

@Injectable()
export class ActividadService {
  private readonly logger = new Logger(ActividadService.name);

  constructor(
    private supabaseService: SupabaseService,
    private rankingGateway: RankingGateway
  ) { }

  // --- HELPERS ---

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

  // --- GESTIÓN DE ACTIVIDADES (PROFESOR) ---

  async createActividad(claseId: string, dto: CreateActividadDto, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    if (!dto.nombre || !dto.descripcion) {
      throw new BadRequestException('Nombre y descripción son obligatorios');
    }

    if (dto.tipo === 'evaluacion') {
      if (!dto.fechaInicio || !dto.fechaFin) {
        throw new BadRequestException('Las actividades de evaluación requieren fechaInicio y fechaFin');
      }
    }

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
      const createdEjercicioIds: string[] = [];

      // Crear nuevos ejercicios si vienen en el payload
      if (dto.nuevosEjercicios && dto.nuevosEjercicios.length > 0) {
        for (const e of dto.nuevosEjercicios) {
          const metadataObj: any = {};
          try {
            if ((e as any).metadata) Object.assign(metadataObj, JSON.parse((e as any).metadata));
          } catch (err) {
            if ((e as any).metadata && typeof (e as any).metadata === 'object') Object.assign(metadataObj, (e as any).metadata);
          }
          if ((e as any).titulo) metadataObj.title = (e as any).titulo;

          // Resolver tipo_id basado en la key (string)
          let tipoIdForEjercicio: string | null = null;
          if ((e as any).tipo) {
            const keyCandidate = (e as any).tipo as string;
            const keysToTry = [keyCandidate];
            if (keyCandidate === 'verdadero-falso') keysToTry.push('true_false');
            if (keyCandidate === 'multiple-choice') keysToTry.push('choice', 'multiple_choice');
            if (keyCandidate === 'abierta') keysToTry.push('abierta');

            const { data: tipoRows } = await supabase
              .from('tipo_ejercicio')
              .select('id')
              .in('key', keysToTry)
              .limit(1);
            if (tipoRows && tipoRows.length > 0) {
              tipoIdForEjercicio = tipoRows[0].id;
            }
          }

          const payload: any = {
            enunciado: (e as any).enunciado || (e as any).titulo || '',
            puntos: (e as any).puntos ?? 1,
            metadata: Object.keys(metadataObj).length ? metadataObj : null,
            creado_por: userId
          };
          if (tipoIdForEjercicio) payload.tipo_id = tipoIdForEjercicio;

          const { data: ej, error: ejError } = await supabase.from('ejercicio').insert(payload).select().single();
          if (ejError) {
            throw new BadRequestException('Error al crear ejercicio: ' + ejError.message);
          }
          createdEjercicioIds.push(ej.id);

          if ((e as any).opciones && Array.isArray((e as any).opciones) && (e as any).opciones.length > 0) {
            const opcionesRows = (e as any).opciones.map((o: any) => ({ ejercicio_id: ej.id, texto: o.texto, is_correcta: !!o.is_correcta }));
            const { error: optError } = await supabase.from('opcion_ejercicio').insert(opcionesRows);
            if (optError) {
              throw new BadRequestException('Error al crear opciones de ejercicio: ' + optError.message);
            }
          }
        }
      }

      // Validar IDs existentes y asociar
      const providedIds = dto.ejercicioIds || [];
      const allEjercicioIds = [...providedIds, ...createdEjercicioIds];

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

  // LISTADO DE ACTIVIDADES (INCLUYE ESTADO DEL INTENTO)
  async getActividades(claseId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    const { data: insc } = await supabase
      .from('inscripcion')
      .select('is_profesor')
      .eq('usuario_id', userId)
      .eq('clase_id', claseId)
      .maybeSingle();

    if (!insc) {
      throw new ForbiddenException('No tienes acceso a esta clase');
    }

    const query = supabase
      .from('actividad')
      .select('*')
      .eq('clase_id', claseId)
      .order('created_at', { ascending: false });

    if (!insc.is_profesor) {
      query.eq('is_visible', true);
    }

    const { data: actividades, error } = await query;
    if (error) throw new BadRequestException('Error al obtener actividades: ' + error.message);

    // Obtener intentos del usuario para determinar el estado (finished/in_progress)
    const actividadIds = actividades.map(a => a.id);
    let intentosMap: Record<string, any> = {};

    if (actividadIds.length > 0) {
      const { data: intentos } = await supabase
        .from('actividad_resultado')
        .select('actividad_id, estado, puntaje, racha_maxima, tiempo_segundos')
        .in('actividad_id', actividadIds)
        .eq('usuario_id', userId);

      (intentos || []).forEach((i: any) => {
        if (!intentosMap[i.actividad_id]) {
          intentosMap[i.actividad_id] = {
            ...i,
            bestStreak: i.racha_maxima || 0,
            bestTime: i.tiempo_segundos || null
          };
        } else {
          // Si ya existe, actualizamos con la mejor estadística
          const current = intentosMap[i.actividad_id];

          // Mejor Racha
          if ((i.racha_maxima || 0) > current.bestStreak) {
            current.bestStreak = i.racha_maxima;
          }

          // Mejor Tiempo (Menor es mejor, solo si finalizó)
          if (i.estado === 'finished' && i.tiempo_segundos) {
            if (!current.bestTime || i.tiempo_segundos < current.bestTime) {
              current.bestTime = i.tiempo_segundos;
            }
          }

          // Mantener el estado más relevante (si alguno está finished, nos quedamos con ese o el último)
          // Simplificación: si el nuevo es finished, sobreescribimos estado/puntaje base
          if (i.estado === 'finished') {
            current.estado = i.estado;
            current.puntaje = i.puntaje;
          }
        }
      });
    }

    const actividadesConEstado = actividades.map(a => ({
      ...a,
      intento: intentosMap[a.id] || null // Agregamos el intento a la actividad
    }));

    // Cargar ejercicios básicos para mostrar en detalle si es necesario
    const actividadConEjercicios: any[] = [];
    for (const a of actividadesConEstado) {
      const { data: ae } = await supabase
        .from('actividad_ejercicio')
        .select('ejercicio:ejercicio_id (id, enunciado, puntos)')
        .eq('actividad_id', a.id);
      const ejercicios = (ae || []).map((r: any) => r.ejercicio);
      actividadConEjercicios.push({ ...a, ejercicios });
    }

    return { actividades: actividadConEjercicios };
  }

  // --- MODIFICADO: ELIMINACIÓN EN CASCADA (ACTIVIDAD + EJERCICIOS) ---
  async deleteActividad(claseId: string, actividadId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);
    await this.verificarEsProfesor(claseId, userId, accessToken);

    try {
      // 1. RECOLECTAR IDs DE EJERCICIOS ANTES DE ROMPER LA RELACIÓN
      const { data: relaciones } = await supabase
        .from('actividad_ejercicio')
        .select('ejercicio_id')
        .eq('actividad_id', actividadId);

      // Extraemos los IDs en un array simple
      const ejercicioIds = (relaciones || []).map(r => r.ejercicio_id);

      // 2. Borrar resultados (intentos) de alumnos
      await supabase.from('actividad_resultado').delete().eq('actividad_id', actividadId);

      // 3. Borrar la relación intermedia
      await supabase.from('actividad_ejercicio').delete().eq('actividad_id', actividadId);

      // 4. Borrar la actividad
      const { error } = await supabase
        .from('actividad')
        .delete()
        .eq('id', actividadId)
        .eq('clase_id', claseId);

      if (error) throw new BadRequestException('Error al eliminar actividad: ' + error.message);

      // 5. BORRAR LOS EJERCICIOS HUÉRFANOS
      if (ejercicioIds.length > 0) {
        // Primero borramos las opciones (por si no hay Cascade en DB)
        await supabase.from('opcion_ejercicio').delete().in('ejercicio_id', ejercicioIds);
        // Finalmente borramos los ejercicios
        await supabase.from('ejercicio').delete().in('id', ejercicioIds);
      }

      return { message: 'Actividad y sus ejercicios eliminados correctamente' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Error al eliminar actividad');
    }
  }

  async updateActividad(claseId: string, actividadId: string, dto: UpdateActividadDto, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);
    await this.verificarEsProfesor(claseId, userId, accessToken);

    if ((dto.fechaInicio && !dto.fechaFin) || (!dto.fechaInicio && dto.fechaFin)) {
      throw new BadRequestException('Debe proporcionar ambas fechas al actualizar si una de ellas está presente');
    }

    try {
      // 1. Actualizar datos básicos
      const updatePayload: any = {};
      if (dto.nombre !== undefined) updatePayload.nombre = dto.nombre;
      if (dto.descripcion !== undefined) updatePayload.descripcion = dto.descripcion;
      if (dto.fechaInicio !== undefined) updatePayload.fecha_inicio = dto.fechaInicio;
      if (dto.fechaFin !== undefined) updatePayload.fecha_fin = dto.fechaFin;
      if (dto.isVisible !== undefined) updatePayload.is_visible = dto.isVisible;

      if (Object.keys(updatePayload).length > 0) {
        await supabase.from('actividad').update(updatePayload).eq('id', actividadId).eq('clase_id', claseId);
      }

      // 2. Crear ejercicios nuevos (si vienen)
      const createdEjercicioIds: string[] = [];
      if (dto.nuevosEjercicios && dto.nuevosEjercicios.length > 0) {
        for (const e of dto.nuevosEjercicios) {
          const metadataObj: any = {};
          if (e.titulo) metadataObj.title = e.titulo;

          // Mapeo de tipos (simplificado)
          let tipoId = null;
          if (e.tipo) {
            const { data } = await supabase.from('tipo_ejercicio').select('id').eq('key', e.tipo).single();
            if (!data && (e.tipo === 'multiple-choice')) { /* fallback logic */ }
            if (data) tipoId = data.id;
          }

          const payload: any = {
            enunciado: e.enunciado || e.titulo || '',
            puntos: e.puntos ?? 1,
            metadata: metadataObj,
            creado_por: userId,
            tipo_id: tipoId
          };

          const { data: ej } = await supabase.from('ejercicio').insert(payload).select().single();
          if (ej) {
            createdEjercicioIds.push(ej.id);
            // Insertar opciones si hay
            if (e.opciones?.length) {
              const opts = e.opciones.map((o: any) => ({ ejercicio_id: ej.id, texto: o.texto, is_correcta: o.is_correcta }));
              await supabase.from('opcion_ejercicio').insert(opts);
            }
          }
        }
      }

      // 3. VINCULACIÓN DE EJERCICIOS (CRÍTICO PARA ELIMINAR)
      // Si ejercicioIds es un array (aunque sea vacío), significa que estamos REEMPLAZANDO la lista
      if (dto.ejercicioIds && Array.isArray(dto.ejercicioIds)) {
        // a. Borrar TODAS las asociaciones actuales
        await supabase.from('actividad_ejercicio').delete().eq('actividad_id', actividadId);

        // b. Combinar los que quedaron (filtrados en el front) + los nuevos creados
        const allIds = [...dto.ejercicioIds, ...createdEjercicioIds];
        const uniqueIds = Array.from(new Set(allIds));

        // c. Insertar la nueva lista limpia
        if (uniqueIds.length > 0) {
          const rows = uniqueIds.map((eid) => ({ actividad_id: actividadId, ejercicio_id: eid }));
          const { error } = await supabase.from('actividad_ejercicio').insert(rows);
          if (error) throw new BadRequestException('Error al actualizar ejercicios: ' + error.message);
        }
      }
      // Caso: Solo agregar nuevos (append) sin tocar los existentes
      else if (createdEjercicioIds.length > 0) {
        const rows = createdEjercicioIds.map((eid) => ({ actividad_id: actividadId, ejercicio_id: eid }));
        await supabase.from('actividad_ejercicio').insert(rows);
      }

      return { message: 'Actividad actualizada' };
    } catch (error) {
      throw new InternalServerErrorException('Error al actualizar actividad');
    }
  }

  async getEjerciciosDeClase(claseId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);
    const { data: insc } = await supabase.from('inscripcion').select('id').eq('usuario_id', userId).eq('clase_id', claseId).maybeSingle();
    if (!insc) throw new ForbiddenException('No tienes acceso a esta clase');
    // Implementación placeholder para este método auxiliar
    return { ejercicios: [] };
  }

  // --- MÉTODOS PARA EL ALUMNO (EVALUACIÓN) ---

  /**
   * CA: Obtener detalle para realizar examen (SIN respuestas correctas)
   * Lógica robusta para detectar tipos de ejercicio
   */
  async getActividadById(actividadId: string, userId: string, accessToken?: string) {
    // Validar que sea un UUID válido para evitar errores de base de datos
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(actividadId)) {
      throw new NotFoundException('Actividad no encontrada (ID inválido)');
    }

    const supabase = this.supabaseService.getClient(accessToken);

    const { data, error } = await supabase
      .from('actividad')
      .select(`
        *,
        actividad_ejercicio (
          orden,
          ejercicio (
            id,
            tipo_id,
            enunciado,
            puntos,
            metadata,
            tipo_ejercicio ( key ),
            opcion_ejercicio (id, texto, is_correcta) 
          )
        )
      `)
      .eq('id', actividadId)
      .single();

    if (error || !data) {
      this.logger.error(`Error al obtener actividad ${actividadId}: ${error?.message}`);
      throw new NotFoundException('Actividad no encontrada');
    }

    // Verificar si es profesor para saber si mostrar respuestas
    const { data: inscripcion } = await supabase
      .from('inscripcion')
      .select('is_profesor')
      .eq('clase_id', data.clase_id)
      .eq('usuario_id', userId)
      .maybeSingle();

    const isProfesor = !!inscripcion?.is_profesor;
    const actividad: any = data;

    const ejercicios = (actividad.actividad_ejercicio || [])
      .sort((a: any, b: any) => a.orden - b.orden)
      .map((ae: any) => {
        const ej = ae.ejercicio;
        if (!ej) return null;

        let tipoKey = 'desconocido';
        const te = ej.tipo_ejercicio;

        if (te) {
          if (Array.isArray(te) && te.length > 0) tipoKey = te[0].key;
          else if (te.key) tipoKey = te.key;
        }

        if ((tipoKey === 'desconocido' || !tipoKey) && ej.opcion_ejercicio && ej.opcion_ejercicio.length > 0) {
          tipoKey = 'multiple-choice';
        }
        if ((tipoKey === 'desconocido' || !tipoKey) && (!ej.opcion_ejercicio || ej.opcion_ejercicio.length === 0)) {
          tipoKey = 'abierta';
        }

        // LÓGICA DE SEGURIDAD:
        // Si NO es profesor, eliminamos el campo 'is_correcta' de las opciones
        const opciones = (ej.opcion_ejercicio || []).map((op: any) => {
          if (!isProfesor) {
            const { is_correcta, ...resto } = op;
            return resto;
          }
          return op;
        });

        return {
          ...ej,
          tipo: tipoKey,
          opciones: opciones
        };
      })
      .filter((e: any) => e !== null);

    return {
      actividad: {
        ...actividad,
        ejercicios: ejercicios
      }
    };
  }

  /**
   * CA1: Iniciar evaluación (Intento único)
   */
  async iniciarIntento(actividadId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    const { data: actividad, error: actError } = await supabase
      .from('actividad')
      .select('*')
      .eq('id', actividadId)
      .single();

    if (actError || !actividad) throw new NotFoundException('Actividad no encontrada');

    // Validar fechas y lógica según tipo
    const ahora = new Date();
    const inicio = actividad.fecha_inicio ? new Date(actividad.fecha_inicio) : null;
    const fin = actividad.fecha_fin ? new Date(actividad.fecha_fin) : null;

    // 1. Buscar si hay uno "en progreso", lo retomamos siempre
    const { data: enProgreso } = await supabase
      .from('actividad_resultado')
      .select('*')
      .eq('actividad_id', actividadId)
      .eq('usuario_id', userId)
      .eq('estado', 'in_progress')
      .maybeSingle();

    if (enProgreso) {
      return { message: 'Retomando intento', intento: enProgreso };
    }

    // 2. NUEVA LÓGICA ANTI-RACE CONDITION
    // Antes de insertar, borrar intentos "zombies" creados hace menos de 1 min sin respuestas
    // Esto limpia la basura generada por el doble request del frontend
    const haceUnMinuto = new Date(Date.now() - 60 * 1000).toISOString();
    await supabase
      .from('actividad_resultado')
      .delete()
      .eq('actividad_id', actividadId)
      .eq('usuario_id', userId)
      .eq('estado', 'in_progress')
      .lt('puntaje', 0) // Opcional: filtro de seguridad
      .gte('created_at', haceUnMinuto);

    // 3. Insertar Nuevo (Lógica existente)
    const { data: nuevoIntento, error: createError } = await supabase
      .from('actividad_resultado')
      .insert({
        // ... tus campos
        actividad_id: actividadId,
        clase_id: actividad.clase_id,
        usuario_id: userId,
        registro_id: `ATT-${Date.now()}`,
        respuestas: [],
        estado: 'in_progress',
        started_at: new Date(),
      })
      .select()
      .single();

    if (createError) {
      // Si falla por unique constraint (si tuvieras), intentamos recuperar el que ganó la carrera
      if (createError.code === '23505') {
        const { data: retry } = await supabase.from('actividad_resultado').select('*').eq('actividad_id', actividadId).eq('usuario_id', userId).eq('estado', 'in_progress').single();
        return { message: 'Retomando intento (recuperado)', intento: retry };
      }
      throw new InternalServerErrorException('Error al iniciar intento: ' + createError.message);
    }

    return { message: 'Actividad iniciada', intento: nuevoIntento };
  }

  /**
   * CA5: Guardado automático
   */
  async guardarRespuestaParcial(
    resultadoId: string,
    dto: RespuestaParcialDto,
    userId: string,
    accessToken?: string
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    const { data: intento } = await supabase
      .from('actividad_resultado')
      .select('respuestas, estado')
      .eq('id', resultadoId)
      .eq('usuario_id', userId)
      .single();

    if (!intento || intento.estado !== 'in_progress') {
      throw new ForbiddenException('El intento no es válido o ya finalizó');
    }

    let respuestas = (intento.respuestas as any[]) || [];
    respuestas = respuestas.filter(r => r.ejercicioId !== dto.ejercicioId);
    respuestas.push(dto);

    const { error } = await supabase
      .from('actividad_resultado')
      .update({ respuestas, updated_at: new Date() })
      .eq('id', resultadoId);

    if (error) throw new InternalServerErrorException('Error al guardar respuesta');

    return { success: true };
  }

  /**
   * CA4: Finalizar y Calificar
   */
  async finalizarIntento(
    resultadoId: string,
    userId: string,
    accessToken?: string,
    dto?: FinalizarIntentoDto | any
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    // ---------------------------------------------------------
    // 1. NORMALIZACIÓN DE RESPUESTAS (Fix Frontend Payload)
    // ---------------------------------------------------------
    let respuestasFinales: any[] = [];

    if (dto) {
      if (Array.isArray(dto)) {
        respuestasFinales = dto;
      } else if (dto.respuestas && Array.isArray(dto.respuestas)) {
        respuestasFinales = dto.respuestas;
      }
    }

    // ---------------------------------------------------------
    // 1.5. SANITIZACIÓN
    // ---------------------------------------------------------
    // Si por error llega un array anidado [[...]], lo aplanamos.
    // Esto convierte [[]] en [] y [[{data}]] en [{data}].
    if (respuestasFinales.length > 0 && Array.isArray(respuestasFinales[0])) {
      respuestasFinales = respuestasFinales.flat();
    }

    // Filtrar basura: aseguramos que solo queden objetos válidos con ejercicioId
    respuestasFinales = respuestasFinales.filter(r =>
      r && typeof r === 'object' && !Array.isArray(r) && r.ejercicioId
    );

    // ---------------------------------------------------------
    // 2. PERSISTENCIA PREVIA (Guardar respuestas limpias)
    // ---------------------------------------------------------
    const updatePayload: any = { updated_at: new Date() };

    if (respuestasFinales.length > 0) {
      updatePayload.respuestas = respuestasFinales;
    }

    if (dto && typeof dto.tiempoSegundos === 'number') {
      updatePayload.tiempo_segundos = dto.tiempoSegundos;
    }

    // Solo actualizamos si hay algo más que updated_at
    if (Object.keys(updatePayload).length > 1) {
      const { error: updateError } = await supabase
        .from('actividad_resultado')
        .update(updatePayload)
        .eq('id', resultadoId)
        .eq('usuario_id', userId);

      if (updateError) {
        this.logger.error(`Error guardando respuestas: ${updateError.message}`);
        throw new InternalServerErrorException('Error al guardar respuestas');
      }
    }

    // ---------------------------------------------------------
    // 3. OBTENCIÓN DEL INTENTO
    // ---------------------------------------------------------
    const { data: intento } = await supabase
      .from('actividad_resultado')
      .select('*, actividad:actividad_id(*)')
      .eq('id', resultadoId)
      .single();

    // Si ya estaba finalizado, retornamos el resultado existente
    if (intento && intento.estado === 'finished') {
      return {
        message: 'Evaluación ya finalizada anteriormente',
        puntaje: intento.puntaje,
        resultado: intento
      };
    }

    if (!intento || intento.usuario_id !== userId) {
      throw new BadRequestException('Intento no válido');
    }

    // ---------------------------------------------------------
    // 4. CALIFICACIÓN
    // ---------------------------------------------------------
    const { data: ejerciciosRaw } = await supabase
      .from('actividad_ejercicio')
      .select(`
        orden,
        ejercicio:ejercicio_id (
          id, puntos, tipo_id,
          opcion_ejercicio (id, texto, is_correcta)
        )
      `)
      .eq('actividad_id', intento.actividad_id);

    // Ordenar por orden para calcular racha correctamente
    const ejercicios = (ejerciciosRaw || []).sort((a: any, b: any) => a.orden - b.orden);

    let puntajeTotal = 0;
    let currentStreak = 0;
    let maxStreak = 0;

    // Usamos las respuestas limpias (o las de DB si el payload vino vacío)
    let respuestasUsuario = respuestasFinales.length > 0 ? respuestasFinales : (intento.respuestas as any[]) || [];

    // Doble check de sanitización por si DB tenía basura vieja
    if (respuestasUsuario.length > 0 && Array.isArray(respuestasUsuario[0])) {
      respuestasUsuario = respuestasUsuario.flat();
    }

    (ejercicios || []).forEach((item: any) => {
      const ej = item.ejercicio;
      if (!ej) return;

      const respuestaUser = respuestasUsuario.find((r: any) => r.ejercicioId === ej.id);
      let isCorrect = false;

      if (respuestaUser && ej.opcion_ejercicio && ej.opcion_ejercicio.length > 0) {
        const opcionCorrecta = ej.opcion_ejercicio.find((o: any) => o.is_correcta);

        if (opcionCorrecta && String(respuestaUser.respuesta).trim() === String(opcionCorrecta.id).trim()) {
          puntajeTotal += Number(ej.puntos);
          isCorrect = true;
        }
      }

      // Cálculo de Racha
      if (isCorrect) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    // ---------------------------------------------------------
    // 5. CIERRE DEL INTENTO
    // ---------------------------------------------------------
    const { data: resultadoFinal, error } = await supabase
      .from('actividad_resultado')
      .update({
        estado: 'finished',
        puntaje: puntajeTotal,
        racha_maxima: maxStreak,
        finished_at: new Date(),
        respuestas: respuestasUsuario
      })
      .eq('id', resultadoId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException('Error al finalizar: ' + error.message);

    // Emitir evento de ranking
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email')
        .eq('id', userId)
        .single();

      // Obtener clase_id de la actividad
      const { data: actividadData } = await supabase
        .from('actividad')
        .select('clase_id')
        .eq('id', intento.actividad_id)
        .single();

      if (userData && actividadData) {
        this.rankingGateway.emitRankingUpdate({
          type: 'actividad',
          usuario: userData,
          puntaje: puntajeTotal,
          actividadId: intento.actividad_id,
          claseId: actividadData.clase_id,
          fecha: new Date(),
        });
      }
    } catch (e) {
      this.logger.error('Error emitiendo ranking update', e);
    }

    return {
      message: 'Evaluación enviada correctamente',
      puntaje: puntajeTotal,
      resultado: resultadoFinal
    };
  }

  // REVISIÓN (Soporta intento específico o último por defecto)
  async getRevision(actividadId: string, userId: string, accessToken?: string, intentoId?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    // 1. Construir query base
    let query = supabase
      .from('actividad_resultado')
      .select('id, estado, respuestas, puntaje, created_at')
      .eq('actividad_id', actividadId)
      .eq('usuario_id', userId)
      .eq('estado', 'finished');

    // 2. Filtrar: Si hay ID específico lo usamos, sino traemos el último
    if (intentoId) {
      query = query.eq('id', intentoId);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data: intentos } = await query;
    const intento = intentos?.[0];

    if (!intento) throw new ForbiddenException('No se encontró el intento o no está finalizado');

    // 3. Obtener actividad CON respuestas correctas (Igual que antes)
    const { data: actividadData, error } = await supabase
      .from('actividad')
      .select(`
        *,
        actividad_ejercicio (
          orden,
          ejercicio (
            id,
            tipo_id,
            enunciado,
            puntos,
            metadata,
            tipo_ejercicio ( key ),
            opcion_ejercicio (id, texto, is_correcta)
          )
        )
      `)
      .eq('id', actividadId)
      .single();

    if (error || !actividadData) throw new NotFoundException('Actividad no encontrada para revisión');

    const actividad: any = actividadData;

    // Mapeo robusto de ejercicios
    const ejercicios = (actividad.actividad_ejercicio || [])
      .sort((a: any, b: any) => a.orden - b.orden)
      .map((ae: any) => {
        const ej = ae.ejercicio;
        let tipoKey = 'desconocido';
        if (ej.tipo_ejercicio) {
          if (Array.isArray(ej.tipo_ejercicio) && ej.tipo_ejercicio.length) tipoKey = ej.tipo_ejercicio[0].key;
          else if (ej.tipo_ejercicio.key) tipoKey = ej.tipo_ejercicio.key;
        }
        if ((tipoKey === 'desconocido' || !tipoKey) && ej.opcion_ejercicio?.length > 0) tipoKey = 'multiple-choice';
        if ((tipoKey === 'desconocido' || !tipoKey)) tipoKey = 'abierta';

        return { ...ej, tipo: tipoKey, opciones: ej.opcion_ejercicio || [] };
      });

    return { actividad: { ...actividad, ejercicios }, intento };
  }

  /**
   * Obtener historial de intentos (Para lista de resultados)
  */
  async getHistorialIntentos(actividadId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    const { data: intentos, error } = await supabase
      .from('actividad_resultado')
      .select('id, puntaje, finished_at, created_at')
      .eq('actividad_id', actividadId)
      .eq('usuario_id', userId)
      .eq('estado', 'finished')
      .order('created_at', { ascending: true }); // De menor a mayor (cronológico: Intento 1, 2...)

    if (error) throw new BadRequestException('Error al obtener historial');

    return { intentos: intentos || [] };
  }

  // Obtener todos los intentos finalizados de una actividad (con datos del alumno)
  async getIntentosPorActividad(claseId: string, actividadId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);
    await this.verificarEsProfesor(claseId, userId, accessToken);

    const { data, error } = await supabase
      .from('actividad_resultado')
      .select(`
        *,
        usuario:usuario_id (id, nombre, email)
      `)
      .eq('actividad_id', actividadId)
      .eq('estado', 'finished')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return { intentos: data };
  }

  // Calificar manualmente una respuesta (Pregunta Abierta)
  async calificarRespuestaManual(
    claseId: string,
    actividadId: string,
    intentoId: string,
    ejercicioId: string,
    puntajeAsignado: number,
    userId: string,
    accessToken?: string
  ) {
    const supabase = this.supabaseService.getClient(accessToken);
    await this.verificarEsProfesor(claseId, userId, accessToken);

    // 1. Obtener el intento actual
    const { data: intento } = await supabase
      .from('actividad_resultado')
      .select('*')
      .eq('id', intentoId)
      .single();

    if (!intento) throw new NotFoundException('Intento no encontrado');

    // 2. Modificar la respuesta específica
    const respuestas = intento.respuestas || [];
    const respuestaIndex = respuestas.findIndex((r: any) => r.ejercicioId === ejercicioId);

    const now = new Date().toISOString(); // Fecha actual

    if (respuestaIndex === -1) {
      respuestas.push({
        ejercicioId,
        respuesta: '',
        puntajeManual: puntajeAsignado,
        corregido: true,
        correctedAt: now // Guardamos la fecha
      });
    } else {
      respuestas[respuestaIndex] = {
        ...respuestas[respuestaIndex],
        puntajeManual: puntajeAsignado,
        corregido: true,
        correctedAt: now // Guardamos la fecha
      };
    }

    // 3. Recalcular el puntaje TOTAL
    const { data: ejercicios } = await supabase
      .from('actividad_ejercicio')
      .select('ejercicio:ejercicio_id(id, puntos, tipo_id, opcion_ejercicio(id, is_correcta))')
      .eq('actividad_id', actividadId);

    let nuevoPuntajeTotal = 0;

    (ejercicios || []).forEach((ae: any) => {
      const ej = ae.ejercicio;
      const respUser = respuestas.find((r: any) => r.ejercicioId === ej.id);

      if (respUser) {
        if (respUser.puntajeManual !== undefined) {
          nuevoPuntajeTotal += Number(respUser.puntajeManual);
        } else {
          const opcionCorrecta = ej.opcion_ejercicio?.find((o: any) => o.is_correcta);
          if (opcionCorrecta && respUser.respuesta === opcionCorrecta.id) {
            nuevoPuntajeTotal += Number(ej.puntos);
          }
        }
      }
    });

    // 4. Guardar en Base de Datos
    const { error } = await supabase
      .from('actividad_resultado')
      .update({
        respuestas: respuestas,
        puntaje: nuevoPuntajeTotal,
        updated_at: now
      })
      .eq('id', intentoId);

    if (error) throw new InternalServerErrorException('Error al guardar corrección');

    return { message: 'Calificación actualizada', puntaje: nuevoPuntajeTotal };
  }

  // --- RANKING ---

  async getGlobalRanking(accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    // Traemos todos los resultados finalizados
    // Nota: En producción esto debería ser una vista o RPC para escalar
    const { data: resultados, error } = await supabase
      .from('actividad_resultado')
      .select(`
        puntaje,
        usuario:usuario_id (
          id, nombre, apellido, email
        )
      `)
      .eq('estado', 'finished');

    if (error) {
      this.logger.error('Error fetching ranking data', error);
      throw new InternalServerErrorException('Error al obtener ranking');
    }

    // Agregación en memoria
    const rankingMap = new Map<string, { usuario: any; puntaje: number }>();

    resultados.forEach((r: any) => {
      if (!r.usuario) return;

      const uid = r.usuario.id;
      const current = rankingMap.get(uid) || { usuario: r.usuario, puntaje: 0 };

      current.puntaje += (Number(r.puntaje) || 0);
      rankingMap.set(uid, current);
    });

    // Convertir a array y ordenar
    const ranking = Array.from(rankingMap.values())
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, 10); // Top 10

    return ranking;
  }

  async getGlobalVersusRanking(accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    const { data: resultadosVersus, error: errorVersus } = await supabase
      .from('versus_resultado')
      .select(`
        puntaje,
        usuario:usuario_id (
          id, nombre, apellido, email
        )
      `);

    if (errorVersus) {
      this.logger.error('Error fetching ranking data (versus)', errorVersus);
      throw new InternalServerErrorException('Error al obtener ranking versus');
    }

    const rankingMap = new Map<string, { usuario: any; puntaje: number }>();

    resultadosVersus.forEach((r: any) => {
      if (!r.usuario) return;

      const uid = r.usuario.id;
      const current = rankingMap.get(uid) || { usuario: r.usuario, puntaje: 0 };

      current.puntaje += (Number(r.puntaje) || 0);
      rankingMap.set(uid, current);
    });

    return Array.from(rankingMap.values())
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, 10);
  }

  async getClaseRanking(claseId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    // Traemos resultados finalizados de actividades de la clase
    const { data: resultados, error } = await supabase
      .from('actividad_resultado')
      .select(`
        puntaje,
        usuario:usuario_id (
          id, nombre, apellido, email
        ),
        actividad!inner(clase_id)
      `)
      .eq('estado', 'finished')
      .eq('actividad.clase_id', claseId);

    if (error) {
      this.logger.error('Error fetching class ranking data', error);
      throw new InternalServerErrorException('Error al obtener ranking de clase');
    }

    // Agregación en memoria
    const rankingMap = new Map<string, { usuario: any; puntaje: number }>();

    resultados.forEach((r: any) => {
      if (!r.usuario) return;

      const uid = r.usuario.id;
      const current = rankingMap.get(uid) || { usuario: r.usuario, puntaje: 0 };

      current.puntaje += (Number(r.puntaje) || 0);
      rankingMap.set(uid, current);
    });

    // Convertir a array y ordenar
    const ranking = Array.from(rankingMap.values())
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, 10); // Top 10

    return ranking;
  }

  async getClaseVersusRanking(claseId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    const { data: resultadosVersus, error: errorVersus } = await supabase
      .from('versus_resultado')
      .select(`
        puntaje,
        usuario:usuario_id (
          id, nombre, apellido, email
        )
      `)
      .eq('clase_id', claseId);

    if (errorVersus) {
      this.logger.error('Error fetching class ranking data (versus)', errorVersus);
      throw new InternalServerErrorException('Error al obtener ranking versus de clase');
    }

    const rankingMap = new Map<string, { usuario: any; puntaje: number }>();

    resultadosVersus.forEach((r: any) => {
      if (!r.usuario) return;

      const uid = r.usuario.id;
      const current = rankingMap.get(uid) || { usuario: r.usuario, puntaje: 0 };

      current.puntaje += (Number(r.puntaje) || 0);
      rankingMap.set(uid, current);
    });

    return Array.from(rankingMap.values())
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, 10);
  }
}