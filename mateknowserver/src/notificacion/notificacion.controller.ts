import { Controller, Get, Patch, Param, UseGuards, Request, Delete } from '@nestjs/common';
import { NotificacionService } from './notificacion.service';
import { AuthGuard } from '../auth/guards/auth.guard'; 

@Controller('notificacion')
@UseGuards(AuthGuard) // Protegemos todas las rutas para que requieran login
export class NotificacionController {
  constructor(private readonly notificacionService: NotificacionService) {}

  // CA1 & CA4: Obtener notificaciones del usuario logueado
  @Get()
  findAll(@Request() req) {
    // req.user.id viene del AuthGuard (validación del token)
    return this.notificacionService.obtenerMisNotificaciones(req.user.id);
  }

  // CA3: Marcar una notificación específica como leída
  @Patch(':id/leer')
  marcarLeida(@Param('id') id: string, @Request() req) {
    return this.notificacionService.marcarComoLeida(id, req.user.id);
  }

  @Patch('marcar-todas')
  marcarTodas(@Request() req) {
    return this.notificacionService.marcarTodasComoLeidas(req.user.id);
  }

  @Delete('eliminar-todas')
  eliminarTodas(@Request() req) {
    return this.notificacionService.eliminarTodas(req.user.id);
  }
}