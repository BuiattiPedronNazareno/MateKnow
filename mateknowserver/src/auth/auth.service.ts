import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../lib/supabase.service';

@Injectable()
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Valida un JWT token de Supabase y retorna los datos del usuario
   */
  async validateToken(token: string) {
    try {
      // Crear cliente con el token del usuario
      const supabase = this.supabaseService.getClient(token);

      // Verificar el token y obtener el usuario
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Token inválido o expirado');
      }

      // Opcionalmente, obtener datos adicionales del usuario desde tu tabla usuarios
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.warn('No se pudo obtener datos adicionales del usuario:', userError);
      }

      return {
        id: user.id,
        email: user.email,
        // Agregar datos adicionales si existen
        ...(userData && {
          nombre: userData.nombre,
          apellido: userData.apellido,
        }),
      };
    } catch (error) {
      console.error('Error en validateToken:', error);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  /**
   * Ejemplo de login (si lo necesitas)
   */
  async login(email: string, password: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: data.user,
    };
  }

  /**
   * Ejemplo de registro (si lo necesitas)
   */
  async register(email: string, password: string, nombre: string, apellido: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedException('Error al registrar usuario: ' + error.message);
    }

    // Insertar datos adicionales en la tabla usuarios
    if (data.user) {
      await supabase.from('usuarios').insert({
        id: data.user.id,
        email,
        nombre,
        apellido,
      });
    }

    return {
      accessToken: data.session?.access_token,
      user: data.user,
    };
  }
}