import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EjercicioService } from './ejercicio.service';
import { CreateEjercicioDto } from './dto/create-ejercicio.dto';
import { UpdateEjercicioDto } from './dto/update-ejercicio.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('ejercicios')
@UseGuards(AuthGuard)
export class EjercicioController {
  constructor(private readonly ejercicioService: EjercicioService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEjercicio(
    @Body() createEjercicioDto: CreateEjercicioDto,
    @Request() req,
  ) {
    return this.ejercicioService.createEjercicio(
      createEjercicioDto,
      req.user.id,
      req.token,
    );
  }

  @Get('tipos')
  @HttpCode(HttpStatus.OK)
  async getTiposEjercicio(@Request() req) {
    return this.ejercicioService.getTiposEjercicio(req.token);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getMisEjercicios(@Request() req) {
    return this.ejercicioService.getMisEjercicios(req.user.id, req.token);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getEjercicioById(@Param('id') id: string, @Request() req) {
    return this.ejercicioService.getEjercicioById(id, req.user.id, req.token);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateEjercicio(
    @Param('id') id: string,
    @Body() updateEjercicioDto: UpdateEjercicioDto,
    @Request() req,
  ) {
    return this.ejercicioService.updateEjercicio(
      id,
      updateEjercicioDto,
      req.user.id,
      req.token,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteEjercicio(
    @Param('id') id: string,
    @Query('deleteActividades') deleteActividades: string,
    @Request() req,
  ) {
    const shouldDeleteActividades = deleteActividades === 'true';
    return this.ejercicioService.deleteEjercicio(
      id,
      req.user.id,
      shouldDeleteActividades,
      req.token,
    );
  }
}