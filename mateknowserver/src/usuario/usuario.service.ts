import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../lib/supabase.service';

@Injectable()
export class UsuarioService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Buscar usuario por email
   */
  async buscarPorEmail(email: string, currentUserId: string) {
    const supabase = this.supabaseService.getClient();

    try {
      if (!email || !email.trim()) {
        throw new BadRequestException('El email es requerido');
      }

      // Buscar usuario por email
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email, rol_id')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error || !usuario) {
        throw new NotFoundException('Usuario no encontrado con ese email');
      }

      // No permitir buscar al mismo usuario
      if (usuario.id === currentUserId) {
        throw new BadRequestException('No puedes matricularte a ti mismo');
      }

      return {
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          rolId: usuario.rol_id,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al buscar usuario');
    }
  }

  /**
   * Buscar usuarios por nombre o apellido (opcional para implementar autocompletado)
   */
  async buscarPorNombre(query: string, currentUserId: string, limit: number = 10) {
    const supabase = this.supabaseService.getClient();

    try {
      if (!query || query.trim().length < 2) {
        throw new BadRequestException('La búsqueda debe tener al menos 2 caracteres');
      }

      const searchQuery = `%${query.trim().toLowerCase()}%`;

      // Buscar usuarios que coincidan en nombre o apellido
      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email, rol_id')
        .or(`nombre.ilike.${searchQuery},apellido.ilike.${searchQuery}`)
        .neq('id', currentUserId) // Excluir al usuario actual
        .limit(limit);

      if (error) {
        throw new BadRequestException('Error al buscar usuarios');
      }

      return {
        usuarios: usuarios.map((u) => ({
          id: u.id,
          nombre: u.nombre,
          apellido: u.apellido,
          email: u.email,
          rolId: u.rol_id,
        })),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al buscar usuarios');
    }
  }

  /**
   * Obtener perfil del usuario actual
   */
  async getProfile(userId: string) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email, rol_id, created_at')
        .eq('id', userId)
        .single();

      if (error || !usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      return {
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          rolId: usuario.rol_id,
          createdAt: usuario.created_at,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener perfil');
    }
  }

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(
    userId: string,
    updateData: { nombre?: string; apellido?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .update({
          ...(updateData.nombre && { nombre: updateData.nombre }),
          ...(updateData.apellido && { apellido: updateData.apellido }),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Error al actualizar perfil');
      }

      return {
        message: 'Perfil actualizado exitosamente',
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar perfil');
    }
  }

  /**
   * Obtener estadísticas del usuario (cantidad de clases, etc.)
   */
  async getEstadisticas(userId: string) {
    const supabase = this.supabaseService.getClient();

    try {
      // Contar clases donde es profesor
      const { count: clasesProfesor, error: errorProfesor } = await supabase
        .from('inscripcion')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', userId)
        .eq('is_profesor', true);

      // Contar clases donde es alumno
      const { count: clasesAlumno, error: errorAlumno } = await supabase
        .from('inscripcion')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', userId)
        .eq('is_profesor', false);

      if (errorProfesor || errorAlumno) {
        throw new BadRequestException('Error al obtener estadísticas');
      }

      return {
        estadisticas: {
          clasesComoProfesor: clasesProfesor || 0,
          clasesComoAlumno: clasesAlumno || 0,
          totalClases: (clasesProfesor || 0) + (clasesAlumno || 0),
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener estadísticas');
    }
  }
}