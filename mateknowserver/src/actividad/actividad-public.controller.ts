import { Controller, Get, Post, Put, Param, Body, Request, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ActividadService } from './actividad.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RespuestaParcialDto } from './dto/respuesta-parcial.dto';
import { FinalizarIntentoDto } from './dto/finalizar-intento.dto';

@Controller('actividades')
@UseGuards(AuthGuard)
export class ActividadPublicController {
  constructor(private readonly actividadService: ActividadService) { }

  // GET /actividades/ranking/global
  @Get('ranking/global')
  @HttpCode(HttpStatus.OK)
  async getGlobalRanking(@Request() req) {
    return this.actividadService.getGlobalRanking(req.token);
  }

  // GET /actividades/ranking/global-versus
  @Get('ranking/global-versus')
  @HttpCode(HttpStatus.OK)
  async getGlobalVersusRanking(@Request() req) {
    return this.actividadService.getGlobalVersusRanking(req.token);
  }

  // GET /actividades/:id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getActividadById(@Param('id') id: string, @Request() req) {
    return this.actividadService.getActividadById(id, req.user.id, req.token);
  }

  // POST /actividades/:id/iniciar
  @Post(':id/iniciar')
  @HttpCode(HttpStatus.CREATED)
  async iniciarIntento(@Param('id') id: string, @Request() req) {
    return this.actividadService.iniciarIntento(id, req.user.id, req.token);
  }

  // PUT /actividades/intento/:id/respuesta
  @Put('intento/:id/respuesta')
  @HttpCode(HttpStatus.OK)
  async guardarRespuesta(
    @Param('id') resultadoId: string,
    @Body() dto: RespuestaParcialDto,
    @Request() req
  ) {
    return this.actividadService.guardarRespuestaParcial(resultadoId, dto, req.user.id, req.token);
  }

  // POST /actividades/intento/:id/finalizar
  @Post('intento/:id/finalizar')
  @HttpCode(HttpStatus.OK)
  async finalizarIntento(
    @Param('id') resultadoId: string,
    @Body() dto: FinalizarIntentoDto,
    @Request() req
  ) {
    return this.actividadService.finalizarIntento(resultadoId, req.user.id, req.token, dto);
  }

  // GET /actividades/:id/revision
  @Get(':id/revision')
  @HttpCode(HttpStatus.OK)
  async getRevision(@Param('id') id: string, @Request() req) {
    return this.actividadService.getRevision(id, req.user.id, req.token);
  }

  @Get(':id/historial')
  @HttpCode(HttpStatus.OK)
  async getHistorial(@Param('id') id: string, @Request() req) {
    return this.actividadService.getHistorialIntentos(id, req.user.id, req.token);
  }
}