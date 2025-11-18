import { Controller, Post, Get, Delete, Param, Body, Request, Put, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ActividadService } from './actividad.service';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('clases/:claseId/actividades')
@UseGuards(AuthGuard)
export class ActividadController {
  constructor(private readonly actividadService: ActividadService) {}

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

  @Get('/ejercicios')
  @HttpCode(HttpStatus.OK)
  async getEjercicios(@Param('claseId') claseId: string, @Request() req) {
    return this.actividadService.getEjerciciosDeClase(claseId, req.user.id, req.token);
  }
}
