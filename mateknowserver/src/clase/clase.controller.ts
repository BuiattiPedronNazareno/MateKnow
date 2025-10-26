import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClaseService } from './clase.service';
import { CreateClaseDto } from './dto/create-clase.dto';
import { UpdateClaseDto } from './dto/update-clase.dto';
import { JoinClaseDto } from './dto/join-clase.dto';
import { AddProfesorDto } from './dto/add-profesor.dto';
import { MatricularAlumnoDto } from './dto/matricular-alumno.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('clases')
@UseGuards(AuthGuard)
export class ClaseController {
  constructor(private readonly claseService: ClaseService) {}

  /**
   * POST /clases
   * Crea una nueva clase
   * CA2: El usuario crea una clase
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createClase(
    @Body() createClaseDto: CreateClaseDto,
    @Request() req,
  ) {
    return this.claseService.createClase(createClaseDto, req.user.id, req.token);
  }

  /**
   * POST /clases/join
   * Unirse a una clase con código
   * CA1: Unirse a una clase con código único
   */
  @Post('join')
  @HttpCode(HttpStatus.OK)
  async joinClase(
    @Body() joinClaseDto: JoinClaseDto,
    @Request() req,
  ) {
    return this.claseService.joinClase(joinClaseDto, req.user.id, req.token);
  }

  /**
   * GET /clases
   * Obtener todas las clases del usuario
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getMisClases(@Request() req) {
    return this.claseService.getMisClases(req.user.id, req.token);
  }

  /**
   * GET /clases/:id
   * Obtener detalles de una clase específica
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getClaseById(@Param('id') id: string, @Request() req) {
    return this.claseService.getClaseById(id, req.user.id, req.token);
  }

  /**
   * PUT /clases/:id
   * Actualizar una clase (nombre, descripción, público/privado)
   * CA4: El profesor puede configurar si la clase es pública o privada
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateClase(
    @Param('id') id: string,
    @Body() updateClaseDto: UpdateClaseDto,
    @Request() req,
  ) {
    return this.claseService.updateClase(id, updateClaseDto, req.user.id, req.token);
  }

  /**
   * POST /clases/:id/profesores
   * Agregar un profesor a la clase
   * CA5: El profesor puede agregar otros profesores
   */
  @Post(':id/profesores')
  @HttpCode(HttpStatus.OK)
  async addProfesor(
    @Param('id') id: string,
    @Body() addProfesorDto: AddProfesorDto,
    @Request() req,
  ) {
    return this.claseService.addProfesor(id, addProfesorDto, req.user.id, req.token);
  }

  /**
   * POST /clases/:id/alumnos
   * Matricular manualmente a un alumno (para clases privadas)
   * CA4: Matricular manualmente si la clase es privada
   */
  @Post(':id/alumnos')
  @HttpCode(HttpStatus.OK)
  async matricularAlumno(
    @Param('id') id: string,
    @Body() matricularAlumnoDto: MatricularAlumnoDto,
    @Request() req,
  ) {
    return this.claseService.matricularAlumno(id, matricularAlumnoDto, req.user.id, req.token);
  }

  /**
   * DELETE /clases/:id
   * Eliminar una clase
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteClase(@Param('id') id: string, @Request() req) {
    return this.claseService.deleteClase(id, req.user.id, req.token);
  }

  /**
   * POST /clases/:id/salir
   * Salir de una clase
   */
  @Post(':id/salir')
  @HttpCode(HttpStatus.OK)
  async salirDeClase(@Param('id') id: string, @Request() req) {
    return this.claseService.salirDeClase(id, req.user.id, req.token);
  }
}