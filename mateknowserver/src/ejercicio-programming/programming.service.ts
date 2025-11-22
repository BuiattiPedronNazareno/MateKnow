import { Injectable } from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";

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
      .from("test_case")
      .select("*")
      .eq("ejercicio_id", ejercicioId)
      .order("created_at");

    if (error) throw error;
    return data;
  }

  async runOnPiston(language: string, version: string | null, code: string, stdin = "") {
    const body: any = {
      language,
      files: [{ name: `Main.${language === "python" ? "py" : "txt"}`, content: code }],
      stdin,
    };

    if (version) body.version = version;

    const res = await fetch(`${this.pistonUrl}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.pistonToken ? { Authorization: `Bearer ${this.pistonToken}` } : {})
      },
      body: JSON.stringify(body),
    });

    return await res.json();
  }

  async runTests(language: string, version: string | null, code: string, testCases: any[]) {
    const runResult = await this.runOnPiston(language, version, code, "");

    const tests = [];

    for (const t of testCases) {
      const r = await this.runOnPiston(language, version, code, t.stdin ?? "");
      const stdout = r.run?.stdout?.toString() ?? "";

      const passed = t.expected
        ? stdout.trim() === (t.expected ?? "").trim()
        : false;

      tests.push({
        test_id: t.id,
        passed,
        expected: t.expected,
        got: stdout,
        stderr: r.run?.stderr ?? null,
        time: r.run?.time ?? null,
      });
    }

    const totalWeight = testCases.reduce((a, t) => a + (t.weight ?? 1), 0);
    const passedWeight = tests.reduce((a, t) => {
      const w = testCases.find(tc => tc.id === t.test_id)?.weight ?? 1;
      return a + (t.passed ? w : 0);
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
      .from("programming_attempt")
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

    if (error) throw error;
    return data;
  }

  async createTestCase(dto: any) {
    const { data, error } = await this.supabase
      .from("test_case")
      .insert(dto)
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTestCases(ejercicioId: string) {
    await this.supabase.from("test_case").delete().eq("ejercicio_id", ejercicioId);
  }

  async getAttempts(ejercicioId?: string, usuarioId?: string) {
    let query = this.supabase.from("programming_attempt").select("*");

    if (ejercicioId) query = query.eq("ejercicio_id", ejercicioId);
    if (usuarioId) query = query.eq("usuario_id", usuarioId);

    const { data } = await query.order("created_at", { ascending: false });
    return data;
  }
}
