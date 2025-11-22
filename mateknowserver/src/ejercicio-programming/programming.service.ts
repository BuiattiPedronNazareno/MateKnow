import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class ProgrammingService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );

  private pistonUrl = (process.env.PISTON_URL || 'https://emkc.org/api/v2').replace(/\/$/, '');
  private pistonToken = process.env.PISTON_TOKEN;

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
      files: [{ name: `Main.${language === 'python' ? 'py' : 'txt'}`, content: code }],
      stdin,
    };
    if (version) body.version = version;

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
      throw new InternalServerErrorException(`Piston error ${res.status}: ${text}`);
    }

    return res.json();
  }

  async runTests(language: string, version: string | null, code: string, testCases: any[]) {
    let runResult = null;
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
        });
      } catch (err) {
        tests.push({
          test_id: t.id,
          passed: false,
          expected: t.expected ?? null,
          got: null,
          stderr: String(err),
          time: null,
        });
      }
    }

    const totalWeight = (testCases?.reduce((s, x) => s + (x.weight ?? 1), 0) || testCases.length || 1);
    const passedWeight = tests.reduce((s, tr) => {
      const tMeta = testCases.find((tc: any) => tc.id === tr.test_id);
      const w = tMeta?.weight ?? 1;
      return s + (tr.passed ? w : 0);
    }, 0);
    const score = (passedWeight / totalWeight) * 100;

    return { runResult, tests, score };
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
      ejercicio_id: dto.ejercicio_id ?? dto.ejercicioId ?? dto.ejercicio_id,
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
}
