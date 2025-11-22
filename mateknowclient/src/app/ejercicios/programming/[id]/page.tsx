"use client";
import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { programmingService } from "@/app/services/programmingService";

export default function ProgrammingResolver({ params }: { params: { id: string } }) {
  const ejercicioId = params.id;

  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    programmingService.getTests(ejercicioId).then((r) => {
      setTests(r);
    });
  }, [ejercicioId]);

  const ejecutar = async () => {
    setLoading(true);
    try {
      const res = await programmingService.saveAttempt({
        ejercicioId,
        codigo: code,
        lenguaje: "python",
        runOnly: true, // No guarda
      });

      setOutput(JSON.stringify(res, null, 2));
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const guardar = async () => {
    setLoading(true);
    try {
      const res = await programmingService.saveAttempt({
        ejercicioId,
        codigo: code,
        lenguaje: "python",
        runOnly: false, // Guarda el intento
      });

      setOutput(JSON.stringify(res, null, 2));
      alert('Intento guardado exitosamente');
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Resolver ejercicio</h2>

      <Editor
        height="400px"
        defaultLanguage="python"
        value={code}
        onChange={(v) => setCode(v || "")}
      />

      <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
        <button onClick={ejecutar} disabled={loading}>
          {loading ? 'Ejecutando...' : 'Ejecutar (no guarda)'}
        </button>
        <button onClick={guardar} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar intento'}
        </button>
      </div>

      <pre style={{ marginTop: '20px', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
        {output}
      </pre>

      <div style={{ marginTop: '20px' }}>
        <h3>Tests disponibles:</h3>
        <ul>
          {tests.map((t: any, i: number) => (
            <li key={i}>
              Entrada: &quot;{t.stdin || '(vacío)'}&quot; → Salida esperada: &quot;{t.expected}&quot;
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}