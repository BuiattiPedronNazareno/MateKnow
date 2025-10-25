import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización no proporcionado');
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Token inválido');
    }

    try {
      // Validar el token con Supabase
      const user = await this.authService.validateToken(token);
      
      // IMPORTANTE: Guardar tanto el user como el token en el request
      request.user = user;
      request.token = token; // Guardamos el token para usarlo después
      
      return true;
    } catch (error) {
      console.error('Error validando token:', error); // Para debug
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}