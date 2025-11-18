import { Controller, Post, Get, Body, Param, Request, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { EvaluacionService } from './evaluacion.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RespuestaParcialDto } from './dto/respuesta-parcial.dto';
import { FinalizarIntentoDto } from './dto/finalizar-intento.dto';

@Controller('clases/:claseId/actividades/:actividadId')
@UseGuards(AuthGuard)
export class EvaluacionController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  @Post('iniciar')
  @HttpCode(HttpStatus.CREATED)
  async iniciar(@Param('claseId') claseId: string, @Param('actividadId') actividadId: string, @Request() req) {
    return this.evaluacionService.iniciarIntento(claseId, actividadId, req.user.id, req.token);
  }

  @Post('respuestas')
  @HttpCode(HttpStatus.OK)
  async guardarRespuestas(@Body() dto: RespuestaParcialDto, @Request() req) {
    return this.evaluacionService.guardarRespuestas(dto, req.user.id, req.token);
  }

  @Post('finalizar')
  @HttpCode(HttpStatus.OK)
  async finalizar(@Body() dto: FinalizarIntentoDto, @Request() req) {
    return this.evaluacionService.finalizarIntento(dto, req.user.id, req.token);
  }

  @Get('historial')
  @HttpCode(HttpStatus.OK)
  async historial(@Param('claseId') claseId: string, @Param('actividadId') actividadId: string, @Request() req) {
    return this.evaluacionService.getHistorial(claseId, actividadId, req.user.id, req.token);
  }
}
