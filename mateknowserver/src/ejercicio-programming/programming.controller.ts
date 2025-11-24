import { Body, Controller, Get, Param, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ProgrammingService } from './programming.service';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { CreateTestCaseDto } from './dto/create-testcase.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('programming')
@UseGuards(AuthGuard)
export class ProgrammingController {
  constructor(private readonly svc: ProgrammingService) {}

  @Post('execute')
  async execute(@Body() dto: CreateAttemptDto, @Request() req) {
    const { lenguaje, version, codigo, ejercicioId } = dto;
    const tests = await this.svc.getTestCasesByEjercicio(ejercicioId);
    return await this.svc.runTests(lenguaje, version ?? null, codigo, tests);
  }

  @Post('exercises')
  async createProgrammingExercise(@Body() dto: any, @Request() req) {
    return await this.svc.createProgrammingExercise({
      ...dto,
      creadoPor: req.user.id, 
    });
  }

  @Post('attempts')
  async createAttempt(@Body() dto: CreateAttemptDto, @Request() req) {
    const usuarioId = req.user.id;
    
    const tests = await this.svc.getTestCasesByEjercicio(dto.ejercicioId);
    const { runResult, tests: detail, score, puntajeObtenido, puntajeMaximo } = await this.svc.runTests(
      dto.lenguaje,
      dto.version ?? null,
      dto.codigo,
      tests,
    );
  
    if (dto.runOnly) {
      return { 
        runResult, 
        tests: detail, 
        score,
        puntajeObtenido, // ⭐ Agregar
        puntajeMaximo    // ⭐ Agregar
      };
    }
  
    const saved = await this.svc.saveAttempt({
      ejercicioId: dto.ejercicioId,
      usuarioId,
      codigo: dto.codigo,
      lenguaje: dto.lenguaje,
      runResult,
      tests: detail,
      score: puntajeObtenido, // ⭐ Guardar puntaje real, no porcentaje
    });
  
    return { 
      attempt: saved, 
      runResult, 
      tests: detail, 
      score,
      puntajeObtenido, // ⭐ Agregar
      puntajeMaximo    // ⭐ Agregar
    };
  }

  @Get('attempts')
  async getAttempts(
    @Query('ejercicioId') ejercicioId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Request() req?,
  ) {
    const finalUserId = usuarioId || req.user.id;
    return await this.svc.getAttempts(ejercicioId, finalUserId);
  }

  @Post('exercises/:ejercicioId/tests')
  async createTest(@Param('ejercicioId') ejercicioId: string, @Body() dto: CreateTestCaseDto) {
    return await this.svc.createTestCase({ ...dto, ejercicio_id: ejercicioId });
  }

  @Get('exercises/:ejercicioId/tests')
  async getTests(@Param('ejercicioId') ejercicioId: string) {
    const tests = await this.svc.getTestCasesByEjercicio(ejercicioId);
    return tests || [];
  }

  @Post('exercises/:ejercicioId/tests/delete-all')
  async deleteAll(@Param('ejercicioId') ejercicioId: string) {
    await this.svc.deleteTestCases(ejercicioId);
    return { ok: true };
  }
}
