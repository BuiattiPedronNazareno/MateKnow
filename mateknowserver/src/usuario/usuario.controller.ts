import {
  Controller,
  Get,
  Put,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('usuarios')
@UseGuards(AuthGuard)
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  /**
   * GET /usuarios/buscar?email=ejemplo@gmail.com
   * Buscar usuario por email
   */
  @Get('buscar')
  @HttpCode(HttpStatus.OK)
  async buscarUsuario(
    @Query('email') email: string,
    @Query('nombre') nombre: string,
    @Request() req,
  ) {
    // Si se proporciona email, buscar por email
    if (email) {
      return this.usuarioService.buscarPorEmail(email, req.user.id);
    }

    // Si se proporciona nombre, buscar por nombre
    if (nombre) {
      return this.usuarioService.buscarPorNombre(nombre, req.user.id);
    }

    // Si no se proporciona ningún parámetro, devolver error
    return {
      message: 'Debes proporcionar un email o nombre para buscar',
    };
  }

  /**
   * GET /usuarios/perfil
   * Obtener perfil del usuario actual
   */
  @Get('perfil')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req) {
    return this.usuarioService.getProfile(req.user.id);
  }

  /**
   * PUT /usuarios/perfil
   * Actualizar perfil del usuario actual
   */
  @Put('perfil')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Body() updateData: { nombre?: string; apellido?: string },
    @Request() req,
  ) {
    return this.usuarioService.updateProfile(req.user.id, updateData);
  }

  /**
   * GET /usuarios/estadisticas
   * Obtener estadísticas del usuario (cantidad de clases)
   */
  @Get('estadisticas')
  @HttpCode(HttpStatus.OK)
  async getEstadisticas(@Request() req) {
    return this.usuarioService.getEstadisticas(req.user.id);
  }
}