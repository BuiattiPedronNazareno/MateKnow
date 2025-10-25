import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../lib/supabase.service';
import { CreateClaseDto } from './dto/create-clase.dto';
import { UpdateClaseDto } from './dto/update-clase.dto';
import { JoinClaseDto } from './dto/join-clase.dto';
import { AddProfesorDto } from './dto/add-profesor.dto';
import { MatricularAlumnoDto } from './dto/matricular-alumno.dto';

@Injectable()
export class ClaseService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Crea una nueva clase
   * CA2 y CA3: El usuario crea una clase y se convierte en profesor
   */
  async createClase(createClaseDto: CreateClaseDto, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Generar código único
      const codigo = await this.generarCodigoUnico(accessToken);

      // Crear la clase
      const { data: clase, error: claseError } = await supabase
        .from('clase')
        .insert({
          nombre: createClaseDto.nombre,
          descripcion: createClaseDto.descripcion,
          codigo: codigo,
          is_publico: createClaseDto.isPublico ?? true,
          creador_id: userId,
        })
        .select()
        .single();

      if (claseError) {
        throw new BadRequestException('Error al crear la clase: ' + claseError.message);
      }

      // El trigger auto_inscribir_creador ya inscribe al usuario como profesor
      return {
        message: 'Clase creada exitosamente',
        clase: {
          id: clase.id,
          nombre: clase.nombre,
          descripcion: clase.descripcion,
          codigo: clase.codigo,
          isPublico: clase.is_publico,
          creadorId: clase.creador_id,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear la clase');
    }
  }

  /**
   * Genera un código único de 8 caracteres alfanuméricos
   */
  private async generarCodigoUnico(accessToken?: string): Promise<string> {
    const supabase = this.supabaseService.getClient(accessToken);
    let codigo: string = '';
    let existe = true;

    while (existe) {
      // Generar código aleatorio de 8 caracteres
      codigo = Array.from({ length: 8 }, () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return chars.charAt(Math.floor(Math.random() * chars.length));
      }).join('');

      // Verificar si ya existe
      const { data, error } = await supabase
        .from('clase')
        .select('codigo')
        .eq('codigo', codigo)
        .maybeSingle();

      existe = !!data && !error;
    }

    return codigo;
  }

  /**
   * Unirse a una clase como alumno usando el código
   * CA1: El usuario se une a una clase con un código único
   */
  async joinClase(joinClaseDto: JoinClaseDto, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Buscar la clase por código
      const { data: clase, error: claseError } = await supabase
        .from('clase')
        .select('*')
        .eq('codigo', joinClaseDto.codigo.toUpperCase())
        .single();

      if (claseError || !clase) {
        throw new NotFoundException('Clase no encontrada con ese código');
      }

      // Verificar si ya está inscrito
      const { data: inscripcionExistente } = await supabase
        .from('inscripcion')
        .select('*')
        .eq('usuario_id', userId)
        .eq('clase_id', clase.id)
        .maybeSingle();

      if (inscripcionExistente) {
        throw new BadRequestException('Ya estás inscrito en esta clase');
      }

      // Inscribir como alumno
      const { data: inscripcion, error: inscripcionError } = await supabase
        .from('inscripcion')
        .insert({
          usuario_id: userId,
          clase_id: clase.id,
          is_profesor: false,
        })
        .select()
        .single();

      if (inscripcionError) {
        throw new BadRequestException('Error al inscribirse: ' + inscripcionError.message);
      }

      return {
        message: 'Te has unido a la clase exitosamente',
        clase: {
          id: clase.id,
          nombre: clase.nombre,
          descripcion: clase.descripcion,
          codigo: clase.codigo,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al unirse a la clase');
    }
  }

  /**
   * Obtener todas las clases del usuario (como profesor o alumno)
   */
  async getMisClases(userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      const { data: inscripciones, error } = await supabase
        .from('inscripcion')
        .select(`
          id,
          is_profesor,
          fecha_inscripcion,
          clase:clase_id (
            id,
            nombre,
            descripcion,
            codigo,
            is_publico,
            creador_id,
            created_at
          )
        `)
        .eq('usuario_id', userId)
        .order('fecha_inscripcion', { ascending: false });

      if (error) {
        throw new BadRequestException('Error al obtener clases');
      }

      return {
        clases: inscripciones.map((insc: any) => ({
          id: insc.clase.id,
          nombre: insc.clase.nombre,
          descripcion: insc.clase.descripcion,
          codigo: insc.clase.codigo,
          isPublico: insc.clase.is_publico,
          isProfesor: insc.is_profesor,
          fechaInscripcion: insc.fecha_inscripcion,
        })),
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener clases');
    }
  }

  /**
   * Obtener detalles de una clase específica
   */
  async getClaseById(claseId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Verificar que el usuario esté inscrito
      const { data: inscripcion, error: inscError } = await supabase
        .from('inscripcion')
        .select('is_profesor')
        .eq('usuario_id', userId)
        .eq('clase_id', claseId)
        .single();

      if (inscError || !inscripcion) {
        throw new ForbiddenException('No tienes acceso a esta clase');
      }

      // Obtener clase
      const { data: clase, error: claseError } = await supabase
        .from('clase')
        .select('*')
        .eq('id', claseId)
        .single();

      if (claseError) {
        throw new NotFoundException('Clase no encontrada');
      }

      // Obtener alumnos y profesores
      const { data: inscripciones, error: inscripcionesError } = await supabase
        .from('inscripcion')
        .select(`
          id,
          is_profesor,
          usuario:usuario_id (
            id,
            nombre,
            apellido,
            email
          )
        `)
        .eq('clase_id', claseId);

      if (inscripcionesError) {
        throw new BadRequestException('Error al obtener inscripciones');
      }

      const profesores = inscripciones.filter((i: any) => i.is_profesor);
      const alumnos = inscripciones.filter((i: any) => !i.is_profesor);

      return {
        clase: {
          id: clase.id,
          nombre: clase.nombre,
          descripcion: clase.descripcion,
          codigo: clase.codigo,
          isPublico: clase.is_publico,
          creadorId: clase.creador_id,
          isProfesor: inscripcion.is_profesor,
        },
        profesores: profesores.map((p: any) => p.usuario),
        alumnos: alumnos.map((a: any) => a.usuario),
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener clase');
    }
  }

  /**
   * CA4: Actualizar configuración de la clase (público/privado)
   */
  async updateClase(
    claseId: string,
    updateClaseDto: UpdateClaseDto,
    userId: string,
    accessToken?: string,
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Verificar que sea profesor
      await this.verificarEsProfesor(claseId, userId, accessToken);

      const { data: clase, error } = await supabase
        .from('clase')
        .update({
          ...(updateClaseDto.nombre && { nombre: updateClaseDto.nombre }),
          ...(updateClaseDto.descripcion && { descripcion: updateClaseDto.descripcion }),
          ...(updateClaseDto.isPublico !== undefined && { is_publico: updateClaseDto.isPublico }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', claseId)
        .eq('creador_id', userId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Error al actualizar clase');
      }

      return {
        message: 'Clase actualizada exitosamente',
        clase,
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar clase');
    }
  }

  /**
   * CA5: Agregar otro profesor a la clase
   */
  async addProfesor(
    claseId: string,
    addProfesorDto: AddProfesorDto,
    userId: string,
    accessToken?: string,
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Verificar que el usuario actual sea profesor
      await this.verificarEsProfesor(claseId, userId, accessToken);

      // Verificar que el usuario a promover esté inscrito como alumno
      const { data: inscripcion, error: inscError } = await supabase
        .from('inscripcion')
        .select('*')
        .eq('usuario_id', addProfesorDto.usuarioId)
        .eq('clase_id', claseId)
        .single();

      if (inscError || !inscripcion) {
        throw new BadRequestException('El usuario no está inscrito en esta clase');
      }

      if (inscripcion.is_profesor) {
        throw new BadRequestException('El usuario ya es profesor de esta clase');
      }

      // Promover a profesor
      const { error: updateError } = await supabase
        .from('inscripcion')
        .update({ is_profesor: true })
        .eq('id', inscripcion.id);

      if (updateError) {
        throw new BadRequestException('Error al agregar profesor');
      }

      return {
        message: 'Profesor agregado exitosamente',
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al agregar profesor');
    }
  }

  /**
   * Matricular manualmente a un alumno (para clases privadas)
   */
  async matricularAlumno(
    claseId: string,
    matricularAlumnoDto: MatricularAlumnoDto,
    userId: string,
    accessToken?: string,
  ) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Verificar que sea profesor
      await this.verificarEsProfesor(claseId, userId, accessToken);

      // Verificar que el usuario no esté ya inscrito
      const { data: existe } = await supabase
        .from('inscripcion')
        .select('id')
        .eq('usuario_id', matricularAlumnoDto.usuarioId)
        .eq('clase_id', claseId)
        .maybeSingle();

      if (existe) {
        throw new BadRequestException('El usuario ya está inscrito en esta clase');
      }

      // Inscribir como alumno
      const { error } = await supabase.from('inscripcion').insert({
        usuario_id: matricularAlumnoDto.usuarioId,
        clase_id: claseId,
        is_profesor: false,
      });

      if (error) {
        throw new BadRequestException('Error al matricular alumno: ' + error.message);
      }

      return {
        message: 'Alumno matriculado exitosamente',
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al matricular alumno');
    }
  }

  /**
   * Eliminar una clase
   */
  async deleteClase(claseId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Solo el creador puede eliminar
      const { data: clase, error: claseError } = await supabase
        .from('clase')
        .select('creador_id')
        .eq('id', claseId)
        .single();

      if (claseError || !clase) {
        throw new NotFoundException('Clase no encontrada');
      }

      if (clase.creador_id !== userId) {
        throw new ForbiddenException('Solo el creador puede eliminar la clase');
      }

      const { error } = await supabase.from('clase').delete().eq('id', claseId);

      if (error) {
        throw new BadRequestException('Error al eliminar clase');
      }

      return {
        message: 'Clase eliminada exitosamente',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar clase');
    }
  }

  /**
   * Salir de una clase (alumno o profesor)
   */
  async salirDeClase(claseId: string, userId: string, accessToken?: string) {
    const supabase = this.supabaseService.getClient(accessToken);

    try {
      // Verificar que no sea el creador
      const { data: clase } = await supabase
        .from('clase')
        .select('creador_id')
        .eq('id', claseId)
        .single();

      if (clase && clase.creador_id === userId) {
        throw new BadRequestException(
          'El creador no puede salir de la clase. Debe eliminarla o transferir la propiedad',
        );
      }

      const { error } = await supabase
        .from('inscripcion')
        .delete()
        .eq('usuario_id', userId)
        .eq('clase_id', claseId);

      if (error) {
        throw new BadRequestException('Error al salir de la clase');
      }

      return {
        message: 'Has salido de la clase exitosamente',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al salir de la clase');
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
}