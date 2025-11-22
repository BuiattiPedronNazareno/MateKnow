import { Router } from 'express';
import { Pool } from 'pg';
import { ProgrammingService } from './programming.service';

export function createProgrammingRouter(dbPool: Pool) {
  const router = Router();
  const svc = new ProgrammingService(dbPool);

  router.post('/execute', async (req, res) => {
    try {
      const { lenguaje, version = null, codigo, stdin = '' } = req.body;
      if (!lenguaje || !codigo) return res.status(400).json({ message: 'Faltan campos' });
      const result = await svc.runOnPiston(lenguaje, version, codigo, stdin);
      return res.json({ ok: true, result });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ ok: false, message: err.message || String(err) });
    }
  });

  router.post('/attempts', async (req, res) => {
    try {
      const { ejercicioId, usuarioId, codigo, lenguaje, version = null, runOnly = false } = req.body;
      if (!ejercicioId || !usuarioId || !codigo || !lenguaje) return res.status(400).json({ message: 'Faltan campos' });

      const testCases = await svc.getTestCasesByEjercicio(ejercicioId);
      const { runResult, testsResult, score } = await svc.runTestsForAttempt(lenguaje, version, codigo, testCases);

      if (runOnly) {
        return res.json({ ok: true, runResult, testsResult, score });
      }

      const saved = await svc.saveAttempt({ ejercicioId, usuarioId, codigo, lenguaje, runResult, testsResult, score, isSaved: true });
      return res.json({ ok: true, attempt: saved, runResult, testsResult, score });

    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ ok: false, message: err.message || String(err) });
    }
  });

  router.get('/attempts', async (req, res) => {
    try {
      const { ejercicioId, usuarioId } = req.query;
      const attempts = await svc.getAttempts(ejercicioId as string | undefined, usuarioId as string | undefined);
      return res.json({ ok: true, attempts });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ ok: false, message: err.message || String(err) });
    }
  });

  router.post('/exercises/:ejercicioId/tests', async (req, res) => {
    try {
      const ejercicioId = req.params.ejercicioId;
      const { stdin, expected, weight, timeout_seconds, public: p } = req.body;
      const created = await svc.createTestCase(ejercicioId, { stdin, expected, weight, timeout_seconds, public: p });
      return res.json({ ok: true, test: created });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ ok: false, message: err.message || String(err) });
    }
  });

  router.get('/exercises/:ejercicioId/tests', async (req, res) => {
    try {
      const ejercicioId = req.params.ejercicioId;
      const tests = await svc.getTestCasesByEjercicio(ejercicioId);
      return res.json({ ok: true, tests });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ ok: false, message: err.message || String(err) });
    }
  });

  router.delete('/exercises/:ejercicioId/tests', async (req, res) => {
    try {
      const ejercicioId = req.params.ejercicioId;
      await svc.deleteTestCasesByEjercicio(ejercicioId);
      return res.json({ ok: true });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ ok: false, message: err.message || String(err) });
    }
  });

  return router;
}