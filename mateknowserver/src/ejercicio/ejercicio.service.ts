import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../lib/supabase.service';
import { CreateEjercicioDto } from './dto/create-ejercicio.dto';
import { UpdateEjercicioDto } from './dto/update-ejercicio.dto';

@Injectable()
export class EjercicioService {
  constructor(private supabaseService: SupabaseService) {}

  async createEjercicio(
    createEjercicioDto: CreateEjercicioDto,
    userId: string,
    accessToken?: string,
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      const { data: tipoEjercicio, error: tipoError } = await supabase
        .from('tipo_ejercicio')
        .select('id, key, nombre')
        .eq('id', createEjercicioDto.tipoId)
        .single();

      if (tipoError || !tipoEjercicio) {
        throw new NotFoundException('Tipo de ejercicio no encontrado');
      }

      const opcionesCorrectas = createEjercicioDto.opciones.filter(o => o.isCorrecta);
      if (opcionesCorrectas.length === 0) {
        throw new BadRequestException('Debe haber al menos una opción correcta');
      }

      if (tipoEjercicio.key === 'true_false' && createEjercicioDto.opciones.length !== 2) {
        throw new BadRequestException('Verdadero o Falso debe tener exactamente 2 opciones');
      }

      const { data: ejercicio, error: ejercicioError } = await supabase
        .from('ejercicio')
        .insert({
          tipo_id: createEjercicioDto.tipoId,
          enunciado: createEjercicioDto.enunciado,
          puntos: createEjercicioDto.puntos || 1,
          metadata: {
            is_versus: createEjercicioDto.isVersus || false,
          },
          creado_por: userId,
        })
        .select()
        .single();

      if (ejercicioError) {
        throw new BadRequestException('Error al crear ejercicio: ' + ejercicioError.message);
      }

      const opcionesData = createEjercicioDto.opciones.map((opcion) => ({
        ejercicio_id: ejercicio.id,
        texto: opcion.texto,
        is_correcta: opcion.isCorrecta,
      }));

      const { data: opciones, error: opcionesError } = await supabase
        .from('opcion_ejercicio')
        .insert(opcionesData)
        .select();

      if (opcionesError) {
        await supabase.from('ejercicio').delete().eq('id', ejercicio.id);
        throw new BadRequestException('Error al crear opciones: ' + opcionesError.message);
      }

      return {
        message: 'Ejercicio creado exitosamente',
        ejercicio: {
          id: ejercicio.id,
          tipoId: ejercicio.tipo_id,
          enunciado: ejercicio.enunciado,
          puntos: ejercicio.puntos,
          isVersus: ejercicio.metadata?.is_versus || false,
          opciones: opciones.map(o => ({
            id: o.id,
            texto: o.texto,
            isCorrecta: o.is_correcta,
          })),
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear ejercicio');
    }
  }

  async getMisEjercicios(userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      const { data: ejercicios, error } = await supabase
        .from('ejercicio')
        .select(`
          id,
          enunciado,
          puntos,
          metadata,
          creado_at,
          tipo_ejercicio:tipo_id (
            id,
            key,
            nombre
          ),
          opciones:opcion_ejercicio (
            id,
            texto,
            is_correcta
          )
        `)
        .eq('creado_por', userId)
        .order('creado_at', { ascending: false });

      if (error) {
        throw new BadRequestException('Error al obtener ejercicios');
      }

      return {
        ejercicios: ejercicios.map((ej: any) => ({
          id: ej.id,
          enunciado: ej.enunciado,
          puntos: ej.puntos,
          isVersus: ej.metadata?.is_versus || false,
          tipo: ej.tipo_ejercicio,
          opciones: ej.opciones.map((op: any) => ({
            id: op.id,
            texto: op.texto,
            isCorrecta: op.is_correcta,
          })),
          creadoAt: ej.creado_at,
        })),
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener ejercicios');
    }
  }

  async getEjercicioById(id: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      const { data: ejercicio, error } = await supabase
        .from('ejercicio')
        .select(`
          id,
          enunciado,
          puntos,
          metadata,
          creado_por,
          creado_at,
          tipo_ejercicio:tipo_id (
            id,
            key,
            nombre
          ),
          opciones:opcion_ejercicio (
            id,
            texto,
            is_correcta
          )
        `)
        .eq('id', id)
        .single();

      if (error || !ejercicio) {
        throw new NotFoundException('Ejercicio no encontrado');
      }

      if (ejercicio.creado_por !== userId) {
        throw new ForbiddenException('No tienes permiso para ver este ejercicio');
      }

      return {
        ejercicio: {
          id: ejercicio.id,
          enunciado: ejercicio.enunciado,
          puntos: ejercicio.puntos,
          isVersus: ejercicio.metadata?.is_versus || false,
          tipo: ejercicio.tipo_ejercicio,
          opciones: ejercicio.opciones.map((op: any) => ({
            id: op.id,
            texto: op.texto,
            isCorrecta: op.is_correcta,
          })),
          creadoAt: ejercicio.creado_at,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener ejercicio');
    }
  }

  async updateEjercicio(
    id: string,
    updateEjercicioDto: UpdateEjercicioDto,
    userId: string,
    accessToken?: string,
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      const { data: ejercicioExistente, error: checkError } = await supabase
        .from('ejercicio')
        .select('id, creado_por')
        .eq('id', id)
        .single();

      if (checkError || !ejercicioExistente) {
        throw new NotFoundException('Ejercicio no encontrado');
      }

      if (ejercicioExistente.creado_por !== userId) {
        throw new ForbiddenException('No tienes permiso para editar este ejercicio');
      }

      const updateData: any = {};
      if (updateEjercicioDto.enunciado) updateData.enunciado = updateEjercicioDto.enunciado;
      if (updateEjercicioDto.puntos !== undefined) updateData.puntos = updateEjercicioDto.puntos;
      if (updateEjercicioDto.isVersus !== undefined) {
        updateData.metadata = { is_versus: updateEjercicioDto.isVersus };
      }

      const { error: updateError } = await supabase
        .from('ejercicio')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        throw new BadRequestException('Error al actualizar ejercicio');
      }

      if (updateEjercicioDto.opciones && updateEjercicioDto.opciones.length > 0) {
        const opcionesCorrectas = updateEjercicioDto.opciones.filter(o => o.isCorrecta);
        if (opcionesCorrectas.length === 0) {
          throw new BadRequestException('Debe haber al menos una opción correcta');
        }

        await supabase.from('opcion_ejercicio').delete().eq('ejercicio_id', id);

        const opcionesData = updateEjercicioDto.opciones.map((opcion) => ({
          ejercicio_id: id,
          texto: opcion.texto,
          is_correcta: opcion.isCorrecta,
        }));

        const { error: opcionesError } = await supabase
          .from('opcion_ejercicio')
          .insert(opcionesData);

        if (opcionesError) {
          throw new BadRequestException('Error al actualizar opciones');
        }
      }

      return {
        message: 'Ejercicio actualizado exitosamente',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar ejercicio');
    }
  }

  async deleteEjercicio(
    id: string,
    userId: string,
    deleteActividades: boolean,
    accessToken?: string,
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      const { data: ejercicio, error: checkError } = await supabase
        .from('ejercicio')
        .select('id, creado_por')
        .eq('id', id)
        .single();

      if (checkError || !ejercicio) {
        throw new NotFoundException('Ejercicio no encontrado');
      }

      if (ejercicio.creado_por !== userId) {
        throw new ForbiddenException('No tienes permiso para eliminar este ejercicio');
      }

      const { data: actividadesConEjercicio, error: actError } = await supabase
        .from('actividad_ejercicio')
        .select('actividad_id')
        .eq('ejercicio_id', id);

      if (actError) {
        throw new BadRequestException('Error al verificar actividades');
      }

      if (actividadesConEjercicio && actividadesConEjercicio.length > 0) {
        if (deleteActividades) {
          const actividadIds = actividadesConEjercicio.map(a => a.actividad_id);
          const { error: deleteActError } = await supabase
            .from('actividad')
            .delete()
            .in('id', actividadIds);

          if (deleteActError) {
            throw new BadRequestException('Error al eliminar actividades asociadas');
          }
        } else {
          const { error: deleteRelError } = await supabase
            .from('actividad_ejercicio')
            .delete()
            .eq('ejercicio_id', id);

          if (deleteRelError) {
            throw new BadRequestException('Error al eliminar relaciones con actividades');
          }
        }
      }

      const { error: deleteError } = await supabase
        .from('ejercicio')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new BadRequestException('Error al eliminar ejercicio');
      }

      return {
        message: deleteActividades
          ? 'Ejercicio y actividades asociadas eliminadas exitosamente'
          : 'Ejercicio eliminado exitosamente',
        actividadesEliminadas: deleteActividades ? actividadesConEjercicio?.length || 0 : 0,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar ejercicio');
    }
  }

  async getTiposEjercicio(accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      const { data: tipos, error } = await supabase
        .from('tipo_ejercicio')
        .select('id, key, nombre, descripcion')
        .order('nombre');

      if (error) {
        throw new BadRequestException('Error al obtener tipos de ejercicio');
      }

      return { tipos };
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener tipos de ejercicio');
    }
  }
}