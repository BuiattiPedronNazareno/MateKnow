import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ProgrammingService } from './programming.service';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { CreateTestCaseDto } from './dto/create-testcase.dto';

@Controller('programming')
export class ProgrammingController {
  constructor(private readonly svc: ProgrammingService) {}

  @Post('execute')
  async execute(@Body() dto: CreateAttemptDto) {
    const { lenguaje, version, codigo, ejercicioId } = dto;
    const tests = await this.svc.getTestCasesByEjercicio(ejercicioId);
    return await this.svc.runTests(lenguaje, version ?? null, codigo, tests);
  }

  @Post('attempts')
  async createAttempt(@Body() dto: CreateAttemptDto) {
    const tests = await this.svc.getTestCasesByEjercicio(dto.ejercicioId);
    const { runResult, tests: detail, score } = await this.svc.runTests(
      dto.lenguaje,
      dto.version ?? null,
      dto.codigo,
      tests,
    );

    if (dto.runOnly) {
      return { runResult, tests: detail, score };
    }

    const saved = await this.svc.saveAttempt({
      ejercicioId: dto.ejercicioId,
      usuarioId: dto.usuarioId,
      codigo: dto.codigo,
      lenguaje: dto.lenguaje,
      runResult,
      tests: detail,
      score,
    });

    return { attempt: saved, runResult, tests: detail, score };
  }

  @Get('attempts')
  async getAttempts(@Query('ejercicioId') ejercicioId?: string, @Query('usuarioId') usuarioId?: string) {
    return await this.svc.getAttempts(ejercicioId, usuarioId);
  }

  @Post('exercises/:ejercicioId/tests')
  async createTest(@Param('ejercicioId') ejercicioId: string, @Body() dto: CreateTestCaseDto) {
    return await this.svc.createTestCase({ ...dto, ejercicio_id: ejercicioId });
  }

  @Get('exercises/:ejercicioId/tests')
  async getTests(@Param('ejercicioId') ejercicioId: string) {
    return await this.svc.getTestCasesByEjercicio(ejercicioId);
  }

  @Post('exercises/:ejercicioId/tests/delete-all')
  async deleteAll(@Param('ejercicioId') ejercicioId: string) {
    await this.svc.deleteTestCases(ejercicioId);
    return { ok: true };
  }
}
