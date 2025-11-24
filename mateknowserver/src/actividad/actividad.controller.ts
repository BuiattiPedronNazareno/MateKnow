import { Controller, Post, Get, Delete, Param, Body, Request, Put, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ActividadService } from './actividad.service';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { IniciarIntentoDto } from './dto/iniciar-intento.dto';
import { RespuestaParcialDto } from './dto/respuesta-parcial.dto';
import { FinalizarIntentoDto } from './dto/finalizar-intento.dto';
import { Query } from '@nestjs/common/decorators';

@Controller('clases/:claseId/actividades')
@UseGuards(AuthGuard)
export class ActividadController {
  constructor(private readonly actividadService: ActividadService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createActividad(@Param('claseId') claseId: string, @Body() dto: CreateActividadDto, @Request() req) {
    return this.actividadService.createActividad(claseId, dto, req.user.id, req.token);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getActividades(@Param('claseId') claseId: string, @Request() req) {
    return this.actividadService.getActividades(claseId, req.user.id, req.token);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteActividad(@Param('claseId') claseId: string, @Param('id') id: string, @Request() req) {
    return this.actividadService.deleteActividad(claseId, id, req.user.id, req.token);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateActividad(@Param('claseId') claseId: string, @Param('id') id: string, @Body() dto: UpdateActividadDto, @Request() req) {
    return this.actividadService.updateActividad(claseId, id, dto, req.user.id, req.token);
  }

  @Get('ejercicios')
  @HttpCode(HttpStatus.OK)
  async getEjercicios(@Param('claseId') claseId: string, @Request() req) {
    return this.actividadService.getEjerciciosDeClase(claseId, req.user.id, req.token);
  }

  @Get('ranking')
  @HttpCode(HttpStatus.OK)
  async getClaseRanking(@Param('claseId') claseId: string, @Request() req) {
    return this.actividadService.getClaseRanking(claseId, req.token);
  }

  @Get('ranking/versus')
  @HttpCode(HttpStatus.OK)
  async getClaseVersusRanking(@Param('claseId') claseId: string, @Request() req) {
    return this.actividadService.getClaseVersusRanking(claseId, req.token);
  }

  // --- ENDPOINTS DE REALIZACIÓN (ALUMNO) ---

  @Get(':id/revision')
  @HttpCode(HttpStatus.OK)
  async getRevision(
    @Param('id') id: string,
    @Query('intentoId') intentoId: string,
    @Request() req
  ) {
    return this.actividadService.getRevision(id, req.user.id, req.token, intentoId);
  }

  @Get(':id/historial')
  @HttpCode(HttpStatus.OK)
  async getHistorial(@Param('id') id: string, @Request() req) {
    return this.actividadService.getHistorialIntentos(id, req.user.id, req.token);
  }

  @Post(':id/iniciar')
  @HttpCode(HttpStatus.CREATED)
  async iniciarIntento(@Param('id') id: string, @Request() req) {
    return this.actividadService.iniciarIntento(id, req.user.id, req.token);
  }

  @Put('intento/:id/respuesta')
  @HttpCode(HttpStatus.OK)
  async guardarRespuesta(
    @Param('id') resultadoId: string,
    @Body() dto: RespuestaParcialDto,
    @Request() req
  ) {
    return this.actividadService.guardarRespuestaParcial(resultadoId, dto, req.user.id, req.token);
  }

  @Post('intento/:id/finalizar')
  @HttpCode(HttpStatus.OK)
  async finalizarIntento(
    @Param('id') resultadoId: string,
    @Body() dto: FinalizarIntentoDto,
    @Request() req,
  ) {
    return this.actividadService.finalizarIntento(resultadoId, req.user.id, req.token, dto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getActividadById(@Param('id') id: string, @Request() req) {
    // Este captura cualquier ruta que no sea las anteriores
    return this.actividadService.getActividadById(id, req.user.id, req.token);
  }

  @Get(':id/intentos')
  async getIntentos(@Param('claseId') claseId: string, @Param('id') actividadId: string, @Request() req) {
    return this.actividadService.getIntentosPorActividad(claseId, actividadId, req.user.id, req.token);
  }

  @Post(':id/corregir')
  async corregirManual(
    @Param('claseId') claseId: string,
    @Param('id') actividadId: string,
    @Body() body: { intentoId: string; ejercicioId: string; puntaje: number },
    @Request() req
  ) {
    return this.actividadService.calificarRespuestaManual(
      claseId, actividadId, body.intentoId, body.ejercicioId, body.puntaje, req.user.id, req.token
    );
  }
}