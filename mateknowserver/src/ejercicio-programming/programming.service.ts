import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class ProgrammingService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private pistonUrl = (process.env.PISTON_URL || 'https://emkc.org/api/v2/piston').replace(/\/$/, '');
  private pistonToken = process.env.PISTON_TOKEN;

  async createProgrammingExercise(dto: {
    tipoId: string;
    actividad_id?: string;
    enunciado: string;
    puntos?: number;
    metadata?: any;
    creadoPor?: string;
    tests?: any[];
  }) {
    const { data: ejercicio, error } = await this.supabase
      .from("ejercicio")
      .insert({
        tipo_id: dto.tipoId,
        actividad_id: dto.actividad_id,
        enunciado: dto.enunciado,
        puntos: dto.puntos ?? 1,
        metadata: dto.metadata ?? {},
        creado_por: dto.creadoPor ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    if (Array.isArray(dto.tests) && dto.tests.length > 0) {
      for (const t of dto.tests) {
        await this.createTestCase({
          ejercicio_id: ejercicio.id,
          stdin: t.stdin,
          expected: t.expected,
          weight: t.weight ?? 1,
        });
      }
    }

    return ejercicio;
  }

  async getTestCasesByEjercicio(ejercicioId: string) {
    const { data, error } = await this.supabase
      .from('test_case')
      .select('*')
      .eq('ejercicio_id', ejercicioId)
      .order('created_at', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return data ?? [];
  }

  async runOnPiston(language: string, version: string | null, code: string, stdin = '') {
    const body: any = {
      language,
      version: version || '*',
      files: [
        { 
          name: `main.${language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'java' ? 'java' : 'txt'}`, 
          content: code 
        }
      ],
      stdin,
    };

    console.log('🔵 Sending to Piston:', {
      url: `${this.pistonUrl}/execute`,
      language,
      version: body.version,
      codeLength: code.length
    });

    const res = await fetch(`${this.pistonUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.pistonToken ? { Authorization: `Bearer ${this.pistonToken}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('❌ Piston error response:', text.substring(0, 200));
      throw new InternalServerErrorException(`Piston error ${res.status}: ${text.substring(0, 100)}`);
    }

    const result = await res.json();
    console.log('✅ Piston response:', result);
    
    return result;
  }

  async runTests(language: string, version: string | null, code: string, testCases: any[]) {
    let runResult: any = null;
    try {
      runResult = await this.runOnPiston(language, version, code, '');
    } catch (err) {
      runResult = { error: String(err) };
    }

    const tests: any[] = [];
    for (const t of testCases) {
      try {
        const r = await this.runOnPiston(language, version, code, t.stdin ?? '');
        const stdout = r.run?.stdout?.toString?.() ?? r.stdout ?? '';
        const expected = (t.expected ?? null);
        const passed = expected !== null ? stdout.trim() === expected.trim() : false;
        tests.push({
          test_id: t.id,
          passed,
          expected,
          got: stdout,
          stderr: r.run?.stderr ?? null,
          time: r.run?.time ?? null,
          weight: t.weight ?? 1,
        });
      } catch (err) {
        tests.push({
          test_id: t.id,
          passed: false,
          expected: t.expected ?? null,
          got: null,
          stderr: String(err),
          time: null,
          weight: t.weight ?? 1,
        });
      }
    }

    // ⭐ CÁLCULO: Puntaje directo = suma de pesos de tests pasados
    const totalWeight = testCases.reduce((s, x) => s + (x.weight ?? 1), 0);
    const passedWeight = tests.reduce((s, tr) => s + (tr.passed ? (tr.weight ?? 1) : 0), 0);
    
    const score = totalWeight > 0 ? (passedWeight / totalWeight) * 100 : 0;
    const puntajeObtenido = passedWeight;

    return { 
      runResult, 
      tests, 
      score,
      puntajeObtenido,
      puntajeMaximo: totalWeight
    };
  }

  async saveAttempt(attempt: {
    ejercicioId: string;
    usuarioId: string;
    codigo: string;
    lenguaje: string;
    runResult: any;
    tests: any;
    score: number;
  }) {
    const { data, error } = await this.supabase
      .from('programming_attempt')
      .insert({
        ejercicio_id: attempt.ejercicioId,
        usuario_id: attempt.usuarioId,
        codigo: attempt.codigo,
        lenguaje: attempt.lenguaje,
        run_result: attempt.runResult,
        tests_result: attempt.tests,
        score: attempt.score,
        is_saved: true,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async createTestCase(dto: any) {
    const row = {
      ejercicio_id: dto.ejercicio_id ?? dto.ejercicioId,
      stdin: dto.stdin ?? null,
      expected: dto.expected ?? null,
      weight: dto.weight ?? 1,
      timeout_seconds: dto.timeoutSeconds ?? dto.timeout_seconds ?? 3,
      public: dto.public ?? false,
    };
    const { data, error } = await this.supabase.from('test_case').insert(row).select().single();
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async deleteTestCases(ejercicioId: string) {
    const { error } = await this.supabase.from('test_case').delete().eq('ejercicio_id', ejercicioId);
    if (error) throw new InternalServerErrorException(error.message);
    return { ok: true };
  }

  async getAttempts(ejercicioId?: string, usuarioId?: string) {
    let query: any = this.supabase.from('programming_attempt').select('*');
    if (ejercicioId) query = query.eq('ejercicio_id', ejercicioId);
    if (usuarioId) query = query.eq('usuario_id', usuarioId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new InternalServerErrorException(error.message);
    return data ?? [];
  }

  async updateProgrammingExercise(id: string, dto: any) {
    const { error: err1 } = await this.supabase
      .from('ejercicio')
      .update({
        enunciado: dto.enunciado,
        puntos: dto.puntos ?? 1,
        metadata: dto.metadata ?? {},
      })
      .eq('id', id);

    if (err1) throw new InternalServerErrorException(err1.message);

    await this.deleteTestCases(id);

    for (const t of dto.tests) {
      await this.createTestCase({
        ejercicio_id: id,
        stdin: t.stdin,
        expected: t.expected,
        weight: t.weight ?? 1,
        timeout_seconds: 3,
        public: false,
      });
    }

    return { ok: true };
  }

  async deleteProgrammingExercise(id: string) {
    await this.deleteTestCases(id);

    const { error } = await this.supabase
      .from('ejercicio')
      .delete()
      .eq('id', id);

    if (error) throw new InternalServerErrorException(error.message);
  }
}
