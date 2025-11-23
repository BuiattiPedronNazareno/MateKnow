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
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { UpdateComentarioDto } from './dto/update-comentario.dto';
import { NotificacionService } from '../notificacion/notificacion.service';

@Injectable()
export class AnuncioService {
  constructor(
    private supabaseService: SupabaseService,
    private notificacionService: NotificacionService 
  ) {}

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

      // CA2: Crear anuncio
      const { data: anuncio, error } = await supabase
        .from('anuncio')
        .insert({
          clase_id: claseId,
          usuario_id: userId,
          titulo: createAnuncioDto.titulo,
          descripcion: createAnuncioDto.descripcion,
        })
        .select(`
          *,
          autor:usuario_id ( id, nombre, apellido, email )
        `)
        .single();

      if (error) {
        throw new BadRequestException('Error al crear anuncio: ' + error.message);
      }

      try {
        const link = `/clases/${claseId}/anuncio/${anuncio.id}`;
        
        // Llamada al servicio de notificaciones
        await this.notificacionService.notificarClase(
          claseId,
          `Nuevo anuncio: ${createAnuncioDto.titulo}`,
          'El profesor ha publicado novedades en la clase.',
          link
        );

        await this.notificacionService.notificarClase(
          claseId,
          `Nuevo anuncio: ${createAnuncioDto.titulo}`,
          'El profesor ha publicado novedades en la clase.',
          link,
          userId 
        );

        console.log('Notificación enviada al sistema');
      } catch (notifError) {
        console.error(' Error enviando notificación:', notifError);
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
   * CA4: Obtener todos los anuncios de una clase (Paginado)
   */
  async getAnunciosByClase(
    claseId: string, 
    userId: string, 
    accessToken?: string,
    page: number = 1,
    limit: number = 5
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Verificar acceso
      const { data: inscripcion, error: inscError } = await supabase
        .from('inscripcion')
        .select('id')
        .eq('usuario_id', userId)
        .eq('clase_id', claseId)
        .single();

      if (inscError || !inscripcion) {
        throw new ForbiddenException('No tienes acceso a esta clase');
      }

      // Calcular rango
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Obtener anuncios paginados con conteo exacto
      const { data: anuncios, error, count } = await supabase
        .from('anuncio')
        .select(`
          *,
          autor:usuario_id ( 
            id,
            nombre,
            apellido,
            email
          ),
          comentario(count)
        `, { count: 'exact' }) 
        .eq('clase_id', claseId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        throw new BadRequestException('Error al obtener anuncios');
      }

      return {
        anuncios: anuncios.map((a) => this.formatAnuncio(a)),
        meta: {
          total: count,
          page,
          lastPage: Math.ceil((count || 0) / limit),
        }
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
        .select('clase_id, usuario_id')
        .eq('id', anuncioId)
        .single();

      if (anuncioError || !anuncio) {
        throw new NotFoundException('Anuncio no encontrado');
      }

      // Verificar que el usuario es el autor del anuncio
      if (anuncio.usuario_id !== userId) {
        throw new ForbiddenException('Solo el autor puede editar este anuncio');
      }

      // CA6: Verificar que es profesor de la clase
      await this.verificarEsProfesor(anuncio.clase_id, userId, accessToken);

      // Actualizar anuncio
      const { data: updatedAnuncio, error: updateError } = await supabase
        .from('anuncio')
        .update({
          ...(updateAnuncioDto.titulo && { titulo: updateAnuncioDto.titulo }),
          ...(updateAnuncioDto.descripcion && { descripcion: updateAnuncioDto.descripcion }),
        })
        .eq('id', anuncioId)
        .select(`
          *,
          autor:usuario_id (
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
        .select('clase_id, usuario_id')
        .eq('id', anuncioId)
        .single();

      if (anuncioError || !anuncio) {
        throw new NotFoundException('Anuncio no encontrado');
      }

      // Verificar que el usuario es el autor del anuncio
      if (anuncio.usuario_id !== userId) {
        throw new ForbiddenException('Solo el autor puede eliminar este anuncio');
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
          autor:usuario_id (
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

  // --- FUNCIONALIDAD DE COMENTARIOS ---

  /**
   * CA1: Crear un nuevo comentario
   */
  async createComentario(
    anuncioId: string,
    createDto: CreateComentarioDto,
    userId: string,
    accessToken?: string,
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Verificar acceso (esto ya verifica si el usuario está inscrito en la clase del anuncio)
      await this.getAnuncioById(anuncioId, userId, accessToken);

      const { data, error } = await supabase
        .from('comentario')
        .insert({
          anuncio_id: anuncioId,
          usuario_id: userId,
          contenido: createDto.contenido,
        })
        .select(`
          *,
          autor:usuario_id ( id, nombre, apellido, email )
        `)
        .single();

      if (error) throw new BadRequestException('Error al comentar: ' + error.message);

      return { message: 'Comentario creado', comentario: this.formatComentario(data) };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al crear comentario');
    }
  }

/**
   * CA4 & CA5: Obtener comentarios paginados
   */
  async getComentarios(
    anuncioId: string, 
    userId: string, 
    accessToken?: string,
    page: number = 1,   // Nuevo argumento
    limit: number = 5   // Nuevo argumento
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    // Verificar acceso
    await this.getAnuncioById(anuncioId, userId, accessToken);

    // Calcular rango para Supabase (0-indexed)
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('comentario')
      .select(`
        *,
        autor:usuario_id ( id, nombre, apellido, email )
      `, { count: 'exact' }) // Solicitamos el conteo total
      .eq('anuncio_id', anuncioId)
      .order('created_at', { ascending: false })
      .range(from, to); // Aplicamos paginación

    if (error) throw new BadRequestException('Error al obtener comentarios');

    return { 
      comentarios: data.map(this.formatComentario),
      meta: {
        total: count,
        page,
        lastPage: Math.ceil((count || 0) / limit),
      }
    };
  }

  /**
   * CA3 & CA6: Eliminar comentario (Solo profesor)
   */
  async deleteComentario(comentarioId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    // Obtener comentario y la clase asociada
    const { data: comentario } = await supabase
      .from('comentario')
      .select('anuncio_id, anuncio(clase_id)')
      .eq('id', comentarioId)
      .single();

    if (!comentario) throw new NotFoundException('Comentario no encontrado');

    // CA6: Verificar que el usuario es profesor de la clase
    const claseId = (comentario as any).anuncio.clase_id;
    await this.verificarEsProfesor(claseId, userId, accessToken);

    const { error } = await supabase.from('comentario').delete().eq('id', comentarioId);
    if (error) throw new BadRequestException('Error al eliminar comentario');

    return { message: 'Comentario eliminado' };
  }

  /**
   * CA3: Editar comentario (Solo profesor, según requerimientos estrictos de gestión)
   */
  async updateComentario(
    comentarioId: string,
    updateDto: UpdateComentarioDto,
    userId: string,
    accessToken?: string,
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    const { data: comentario } = await supabase
      .from('comentario')
      .select('anuncio_id, anuncio(clase_id)')
      .eq('id', comentarioId)
      .single();

    if (!comentario) throw new NotFoundException('Comentario no encontrado');

    // CA6: Gestión reservada para profesores
    const claseId = (comentario as any).anuncio.clase_id;
    await this.verificarEsProfesor(claseId, userId, accessToken);

    const { data, error } = await supabase
      .from('comentario')
      .update({
        contenido: updateDto.contenido,
        updated_at: new Date(),
      })
      .eq('id', comentarioId)
      .select(`*, autor:usuario_id ( id, nombre, apellido, email )`)
      .single();

    if (error) throw new BadRequestException('Error al actualizar comentario');

    return { message: 'Comentario actualizado', comentario: this.formatComentario(data) };
  }

  // --- HELPERS ---

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
      fechaPublicacion: anuncio.created_at,
      autor: {
        id: anuncio.autor.id,
        nombre: anuncio.autor.nombre,
        apellido: anuncio.autor.apellido,
        email: anuncio.autor.email,
      },

      cantidadComentarios: anuncio.comentario && anuncio.comentario[0] ? anuncio.comentario[0].count : 0, 
      createdAt: anuncio.created_at,
      updatedAt: anuncio.updated_at || anuncio.created_at,
    };
  }

  private formatComentario(c: any) {
    return {
      id: c.id,
      anuncioId: c.anuncio_id,
      contenido: c.contenido,
      autor: c.autor,
      createdAt: c.created_at,
    };
  }
}