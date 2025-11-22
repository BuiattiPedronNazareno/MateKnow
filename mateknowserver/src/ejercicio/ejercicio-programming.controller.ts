import { Body, Controller, Post, Put, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { CreateProgrammingExerciseDto } from '../ejercicio-programming/dto/create-programming-exercise.dto';
import { ProgrammingService } from '../ejercicio-programming/programming.service';
import { createClient } from '@supabase/supabase-js';
import { UpdateProgrammingExerciseDto } from '../ejercicio-programming/dto/update-programming-exercise.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

@Controller('ejercicio/programming')
@UseGuards(AuthGuard)
export class EjercicioProgrammingController {
    constructor(private readonly svc: ProgrammingService) {}

    @Post('create')
    async create(@Body() dto: CreateProgrammingExerciseDto, @Request() req) {
        const { data: ejData, error } = await supabase
        .from('ejercicio')
        .insert({
            tipo_id: dto.tipoId,
            enunciado: dto.enunciado,
            puntos: dto.puntos ?? 1,
            metadata: dto.metadata ?? {},
            creado_por: req.user.id, 
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

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateProgrammingExerciseDto) {
        return await this.svc.updateProgrammingExercise(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.svc.deleteProgrammingExercise(id);
        return { ok: true };
    }
}