import { Body, Controller, Post } from '@nestjs/common';
import { CreateProgrammingExerciseDto } from '../ejercicio-programming/dto/create-programming-exercise.dto';
import { ProgrammingService } from '../ejercicio-programming/programming.service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);

@Controller('ejercicio/programming')
export class EjercicioProgrammingController {
  constructor(private readonly svc: ProgrammingService) {}

  @Post('create')
  async create(@Body() dto: CreateProgrammingExerciseDto) {
    const { data: ejData, error } = await supabase
      .from('ejercicio')
      .insert({
        tipo_id: dto.tipoId,
        enunciado: dto.enunciado,
        puntos: dto.puntos ?? 1,
        metadata: dto.metadata ?? {},
      })
      .select()
      .single();

    if (error) throw error;
    const newEj = ejData;

    if (Array.isArray(dto.tests) && dto.tests.length) {
      for (const t of dto.tests) {
        await this.svc.createTestCase({
          ejercicio_id: newEj.id,
          stdin: t.stdin,
          expected: t.expected,
          weight: t.weight ?? 1,
          timeout_seconds: 3,
          public: false,
        });
      }
    }

    return { ok: true, ejercicio: newEj };
  }
}
