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
import { AnuncioService } from './anuncio.service';
import { CreateAnuncioDto } from './dto/create-anuncio.dto';
import { UpdateAnuncioDto } from './dto/update-anuncio.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('anuncios')
@UseGuards(AuthGuard)
export class AnuncioController {
  constructor(private readonly anuncioService: AnuncioService) {}

  /**
   * POST /anuncios/clase/:claseId
   * Crear un anuncio en la clase
   * CA1: El profesor puede crear un nuevo anuncio
   */
  @Post('clase/:claseId')
  @HttpCode(HttpStatus.CREATED)
  async createAnuncio(
    @Param('claseId') claseId: string,
    @Body() createAnuncioDto: CreateAnuncioDto,
    @Request() req,
  ) {
    return this.anuncioService.createAnuncio(
      claseId,
      createAnuncioDto,
      req.user.id,
      req.token,
    );
  }

  /**
   * GET /anuncios/clase/:claseId
   * Obtener todos los anuncios de una clase
   * CA4: Los alumnos visualizan los anuncios publicados
   * CA5: Ordenados del más reciente al más antiguo
   */
  @Get('clase/:claseId')
  @HttpCode(HttpStatus.OK)
  async getAnunciosByClase(
    @Param('claseId') claseId: string,
    @Request() req,
  ) {
    return this.anuncioService.getAnunciosByClase(
      claseId,
      req.user.id,
      req.token,
    );
  }

  /**
   * PUT /anuncios/:id
   * Actualizar un anuncio
   * CA3: El profesor puede editar sus anuncios
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateAnuncio(
    @Param('id') id: string,
    @Body() updateAnuncioDto: UpdateAnuncioDto,
    @Request() req,
  ) {
    return this.anuncioService.updateAnuncio(
      id,
      updateAnuncioDto,
      req.user.id,
      req.token,
    );
  }

  /**
   * DELETE /anuncios/:id
   * Eliminar un anuncio
   * CA3: El profesor puede eliminar sus anuncios
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteAnuncio(@Param('id') id: string, @Request() req) {
    return this.anuncioService.deleteAnuncio(id, req.user.id, req.token);
  }

  /**
   * GET /anuncios/:id
   * Obtener un anuncio específico
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getAnuncioById(@Param('id') id: string, @Request() req) {
    return this.anuncioService.getAnuncioById(id, req.user.id, req.token);
  }
}