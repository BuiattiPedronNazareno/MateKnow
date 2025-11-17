import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../lib/supabase.service';
import { CreateAnuncioDto } from './dto/create-anuncio.dto';
import { UpdateAnuncioDto } from './dto/update-anuncio.dto';

@Injectable()
export class AnuncioService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * CA1: Crear un nuevo anuncio
   */
  async createAnuncio(
    claseId: string,
    createAnuncioDto: CreateAnuncioDto,
    userId: string,
    accessToken?: string,
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // CA6: Verificar que el usuario es profesor de la clase
      await this.verificarEsProfesor(claseId, userId, accessToken);

      // CA2: Crear anuncio con fecha de publicación automática
      const { data: anuncio, error } = await supabase
        .from('anuncio')
        .insert({
          clase_id: claseId,
          autor_id: userId,
          titulo: createAnuncioDto.titulo,
          descripcion: createAnuncioDto.descripcion,
          fecha_publicacion: new Date().toISOString(),
        })
        .select(`
          *,
          autor:autor_id (
            id,
            nombre,
            apellido,
            email
          )
        `)
        .single();

      if (error) {
        throw new BadRequestException('Error al crear anuncio: ' + error.message);
      }

      return {
        message: 'Anuncio creado exitosamente',
        anuncio: this.formatAnuncio(anuncio),
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear anuncio');
    }
  }

  /**
   * CA4: Obtener todos los anuncios de una clase
   * CA5: Ordenados del más reciente al más antiguo
   */
  async getAnunciosByClase(claseId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Verificar que el usuario está inscrito en la clase
      const { data: inscripcion, error: inscError } = await supabase
        .from('inscripcion')
        .select('id')
        .eq('usuario_id', userId)
        .eq('clase_id', claseId)
        .single();

      if (inscError || !inscripcion) {
        throw new ForbiddenException('No tienes acceso a esta clase');
      }

      // CA5: Obtener anuncios ordenados por fecha descendente
      const { data: anuncios, error } = await supabase
        .from('anuncio')
        .select(`
          *,
          autor:autor_id (
            id,
            nombre,
            apellido,
            email
          )
        `)
        .eq('clase_id', claseId)
        .order('fecha_publicacion', { ascending: false });

      if (error) {
        throw new BadRequestException('Error al obtener anuncios');
      }

      return {
        anuncios: anuncios.map((a) => this.formatAnuncio(a)),
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener anuncios');
    }
  }

  /**
   * CA3: Editar un anuncio
   */
  async updateAnuncio(
    anuncioId: string,
    updateAnuncioDto: UpdateAnuncioDto,
    userId: string,
    accessToken?: string,
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Obtener el anuncio para verificar permisos
      const { data: anuncio, error: anuncioError } = await supabase
        .from('anuncio')
        .select('clase_id, autor_id')
        .eq('id', anuncioId)
        .single();

      if (anuncioError || !anuncio) {
        throw new NotFoundException('Anuncio no encontrado');
      }

      // CA6: Verificar que es profesor de la clase
      await this.verificarEsProfesor(anuncio.clase_id, userId, accessToken);

      // Actualizar anuncio
      const { data: updatedAnuncio, error: updateError } = await supabase
        .from('anuncio')
        .update({
          ...(updateAnuncioDto.titulo && { titulo: updateAnuncioDto.titulo }),
          ...(updateAnuncioDto.descripcion && { descripcion: updateAnuncioDto.descripcion }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', anuncioId)
        .select(`
          *,
          autor:autor_id (
            id,
            nombre,
            apellido,
            email
          )
        `)
        .single();

      if (updateError) {
        throw new BadRequestException('Error al actualizar anuncio');
      }

      return {
        message: 'Anuncio actualizado exitosamente',
        anuncio: this.formatAnuncio(updatedAnuncio),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar anuncio');
    }
  }

  /**
   * CA3: Eliminar un anuncio
   */
  async deleteAnuncio(anuncioId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Obtener el anuncio para verificar permisos
      const { data: anuncio, error: anuncioError } = await supabase
        .from('anuncio')
        .select('clase_id, autor_id')
        .eq('id', anuncioId)
        .single();

      if (anuncioError || !anuncio) {
        throw new NotFoundException('Anuncio no encontrado');
      }

      // CA6: Verificar que es profesor de la clase
      await this.verificarEsProfesor(anuncio.clase_id, userId, accessToken);

      const { error: deleteError } = await supabase
        .from('anuncio')
        .delete()
        .eq('id', anuncioId);

      if (deleteError) {
        throw new BadRequestException('Error al eliminar anuncio');
      }

      return {
        message: 'Anuncio eliminado exitosamente',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar anuncio');
    }
  }

  /**
   * Obtener un anuncio específico por ID
   */
  async getAnuncioById(anuncioId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Obtener el anuncio
      const { data: anuncio, error: anuncioError } = await supabase
        .from('anuncio')
        .select(`
          *,
          autor:autor_id (
            id,
            nombre,
            apellido,
            email
          )
        `)
        .eq('id', anuncioId)
        .single();

      if (anuncioError || !anuncio) {
        throw new NotFoundException('Anuncio no encontrado');
      }

      // Verificar que el usuario está inscrito en la clase
      const { data: inscripcion, error: inscError } = await supabase
        .from('inscripcion')
        .select('id')
        .eq('usuario_id', userId)
        .eq('clase_id', anuncio.clase_id)
        .single();

      if (inscError || !inscripcion) {
        throw new ForbiddenException('No tienes acceso a este anuncio');
      }

      return {
        anuncio: this.formatAnuncio(anuncio),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener anuncio');
    }
  }

  /**
   * Método auxiliar: verificar si el usuario es profesor de la clase
   */
  private async verificarEsProfesor(claseId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    const { data: inscripcion, error } = await supabase
      .from('inscripcion')
      .select('is_profesor')
      .eq('usuario_id', userId)
      .eq('clase_id', claseId)
      .single();

    if (error || !inscripcion || !inscripcion.is_profesor) {
      throw new ForbiddenException('No tienes permisos de profesor en esta clase');
    }

    return inscripcion;
  }

  /**
   * Formatear datos del anuncio
   */
  private formatAnuncio(anuncio: any) {
    return {
      id: anuncio.id,
      titulo: anuncio.titulo,
      descripcion: anuncio.descripcion,
      fechaPublicacion: anuncio.fecha_publicacion,
      autor: {
        id: anuncio.autor.id,
        nombre: anuncio.autor.nombre,
        apellido: anuncio.autor.apellido,
        email: anuncio.autor.email,
      },
      createdAt: anuncio.created_at,
      updatedAt: anuncio.updated_at,
    };
  }
}