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
  Query,              // Importado para paginación
  DefaultValuePipe,   // Importado para valores por defecto
  ParseIntPipe,       // Importado para convertir string a number
} from '@nestjs/common';
import { AnuncioService } from './anuncio.service';
import { CreateAnuncioDto } from './dto/create-anuncio.dto';
import { UpdateAnuncioDto } from './dto/update-anuncio.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { UpdateComentarioDto } from './dto/update-comentario.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('anuncios')
@UseGuards(AuthGuard)
export class AnuncioController {
  constructor(private readonly anuncioService: AnuncioService) {}

  /**
   * POST /anuncios/clase/:claseId
   * Crear un anuncio en la clase
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
   * Obtener anuncios paginados
   */
  @Get('clase/:claseId')
  @HttpCode(HttpStatus.OK)
  async getAnunciosByClase(
    @Param('claseId') claseId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, // Nuevo
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number, // Nuevo
    @Request() req,
  ) {
    return this.anuncioService.getAnunciosByClase(
      claseId,
      req.user.id,
      req.token,
      page,
      limit
    );
  }

  /**
   * PUT /anuncios/:id
   * Actualizar un anuncio
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

  // --- ENDPOINTS DE COMENTARIOS ---

  /**
   * POST /anuncios/:id/comentarios
   * Crear un comentario en un anuncio
   */
  @Post(':id/comentarios')
  @HttpCode(HttpStatus.CREATED)
  async createComentario(
    @Param('id') anuncioId: string,
    @Body() dto: CreateComentarioDto,
    @Request() req,
  ) {
    return this.anuncioService.createComentario(anuncioId, dto, req.user.id, req.token);
  }

  /**
   * GET /anuncios/:id/comentarios
   * Obtener comentarios de un anuncio con paginación
   * Query params: page (default 1), limit (default 5)
   */
  @Get(':id/comentarios')
  @HttpCode(HttpStatus.OK)
  async getComentarios(
    @Param('id') anuncioId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
    @Request() req,
  ) {
    return this.anuncioService.getComentarios(anuncioId, req.user.id, req.token, page, limit);
  }

  /**
   * DELETE /anuncios/comentarios/:id
   * Eliminar un comentario
   */
  @Delete('comentarios/:id')
  @HttpCode(HttpStatus.OK)
  async deleteComentario(@Param('id') comentarioId: string, @Request() req) {
    return this.anuncioService.deleteComentario(comentarioId, req.user.id, req.token);
  }

  /**
   * PUT /anuncios/comentarios/:id
   * Actualizar un comentario
   */
  @Put('comentarios/:id')
  @HttpCode(HttpStatus.OK)
  async updateComentario(
    @Param('id') comentarioId: string,
    @Body() dto: UpdateComentarioDto,
    @Request() req,
  ) {
    return this.anuncioService.updateComentario(comentarioId, dto, req.user.id, req.token);
  }
}