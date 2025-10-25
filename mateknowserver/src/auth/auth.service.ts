import { 
  Injectable, 
  BadRequestException, 
  InternalServerErrorException,
  UnauthorizedException 
} from '@nestjs/common';
import { SupabaseService } from '../lib/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Inicia sesión de usuario
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const supabase = this.supabaseService.getClient();

    try {
      // Autenticación en Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      if (!data.user) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      // Obtener información del usuario en la tabla 'usuarios'
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, rol_id')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        throw new BadRequestException('Error al obtener datos del usuario');
      }

      return {
        message: 'Login exitoso',
        user: userData,
        session: {
          access_token: data.session?.access_token,
          refresh_token: data.session?.refresh_token,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error en el proceso de login');
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async register(registerDto: RegisterDto) {
    const { email, password, nombre, apellido } = registerDto;
    const supabase = this.supabaseService.getClient();

    try {
      // Crear usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      if (!data.user) {
        throw new InternalServerErrorException(
          'No se pudo crear el usuario en Supabase Auth',
        );
      }

      // Insertar registro en tabla 'usuarios'
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id: data.user.id,
          email,
          nombre,
          apellido,
          rol_id: 1, // Miembro por defecto
        });

      if (insertError) {
        // Si falla la inserción, intentar eliminar el usuario de Auth
        try {
          await supabase.auth.admin.deleteUser(data.user.id);
        } catch (deleteError) {
          console.error('Error al revertir creación de usuario:', deleteError);
        }
        throw new BadRequestException('Error al crear el perfil del usuario ', insertError.message);
      }

      return {
        message: 'Usuario registrado correctamente',
        user: {
          id: data.user.id,
          email: data.user.email,
          nombre,
          apellido,
          rol_id: 1,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error en el proceso de registro');
    }
  }

  /**
   * Valida un token de acceso
   */
  async validateToken(accessToken: string) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase.auth.getUser(accessToken);

      if (error || !data.user) {
        throw new UnauthorizedException('Token inválido o expirado');
      }

      // Obtener información del usuario
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, email, nombre, apellido, rol_id')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        throw new BadRequestException('Usuario no encontrado');
      }

      return userData;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al validar el token');
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  async logout(accessToken: string) {
    const supabase = this.supabaseService.getClient();

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new BadRequestException('Error al cerrar sesión');
      }

      return {
        message: 'Sesión cerrada exitosamente',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al cerrar sesión');
    }
  }
}