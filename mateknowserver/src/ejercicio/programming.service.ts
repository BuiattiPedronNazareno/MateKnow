import { Pool } from 'pg';
import fetch from 'node-fetch';

type TestCase = {
  id: string;
  stdin?: string | null;
  expected?: string | null;
  weight?: number;
  timeout_seconds?: number;
};

export class ProgrammingService {
  private db: Pool;
  private pistonUrl: string;
  private pistonToken?: string;

  constructor(dbPool: Pool) {
    this.db = dbPool;
    this.pistonUrl = (process.env.PISTON_URL || 'https://emkc.org/api/v2').replace(/\/$/, '');
    this.pistonToken = process.env.PISTON_TOKEN;
  }

  async getTestCasesByEjercicio(ejercicioId: string): Promise<TestCase[]> {
    const { rows } = await this.db.query('SELECT * FROM test_case WHERE ejercicio_id = $1 ORDER BY created_at', [ejercicioId]);
    return rows;
  }

  private async runOnPiston(lenguaje: string, version: string | null, codigo: string, stdin = '') {
    const body: any = {
      language: lenguaje,
      files: [{ name: 'Main.' + (lenguaje === 'python' ? 'py' : 'txt'), content: codigo }],
      stdin
    };
    if (version) body.version = version;

    const res = await fetch(`${this.pistonUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.pistonToken ? { Authorization: `Bearer ${this.pistonToken}` } : {})
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Piston error ${res.status}: ${text}`);
    }
    return await res.json();
  }

  async runTestsForAttempt(lenguaje: string, version: string | null, codigo: string, testCases: TestCase[]) {
    let runResult: any = null;
    try {
      runResult = await this.runOnPiston(lenguaje, version, codigo, '');
    } catch (err) {
      runResult = { error: String(err) };
    }

    const testsResult: any[] = [];
    for (const t of testCases) {
      try {
        const r = await this.runOnPiston(lenguaje, version, codigo, t.stdin ?? '');
        const stdout = (r.run?.stdout ?? r.stdout ?? '')?.toString() ?? '';
        const expected = t.expected ?? null;
        const passed = expected !== null ? stdout.trim() === expected.trim() : false;
        testsResult.push({
          test_id: t.id,
          passed,
          expected,
          got: stdout,
          output: stdout,
          time_ms: r.run?.time ?? null,
          error: r.run?.stderr ?? null
        });
      } catch (err) {
        testsResult.push({
          test_id: t.id,
          passed: false,
          expected: t.expected ?? null,
          got: null,
          output: null,
          error: String(err)
        });
      }
    }

    const totalWeight = (testCases?.reduce((s, x) => s + (x.weight ?? 1), 0) || testCases.length || 1);
    const passedWeight = testsResult.reduce((s, tr) => {
      const tMeta = testCases.find(tc => tc.id === tr.test_id);
      const w = tMeta?.weight ?? 1;
      return s + (tr.passed ? w : 0);
    }, 0);
    const score = (passedWeight / totalWeight) * 100;

    return { runResult, testsResult, score };
  }

  async saveAttempt(payload: {
    ejercicioId: string;
    usuarioId: string;
    codigo: string;
    lenguaje: string;
    runResult: any;
    testsResult: any;
    score: number;
    isSaved?: boolean;
  }) {
    const { rows } = await this.db.query(
      `INSERT INTO programming_attempt (ejercicio_id, usuario_id, codigo, lenguaje, run_result, tests_result, score, is_saved)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        payload.ejercicioId,
        payload.usuarioId,
        payload.codigo,
        payload.lenguaje,
        payload.runResult ? JSON.stringify(payload.runResult) : null,
        payload.testsResult ? JSON.stringify(payload.testsResult) : null,
        payload.score,
        payload.isSaved ?? true
      ]
    );
    return rows[0];
  }

  async getAttempts(ejercicioId?: string, usuarioId?: string) {
    const vals: any[] = [];
    const conds: string[] = [];
    if (ejercicioId) { conds.push(`ejercicio_id = $${vals.length + 1}`); vals.push(ejercicioId); }
    if (usuarioId) { conds.push(`usuario_id = $${vals.length + 1}`); vals.push(usuarioId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await this.db.query(`SELECT * FROM programming_attempt ${where} ORDER BY created_at DESC`, vals);
    return rows;
  }

  async createTestCase(ejercicioId: string, t: { stdin?: string, expected?: string, weight?: number, timeout_seconds?: number, public?: boolean }) {
    const { rows } = await this.db.query(
      `INSERT INTO test_case (ejercicio_id, stdin, expected, weight, timeout_seconds, public)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [ejercicioId, t.stdin ?? null, t.expected ?? null, t.weight ?? 1, t.timeout_seconds ?? 3, !!t.public]
    );
    return rows[0];
  }

  async deleteTestCasesByEjercicio(ejercicioId: string) {
    await this.db.query(`DELETE FROM test_case WHERE ejercicio_id = $1`, [ejercicioId]);
  }
}