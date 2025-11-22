"use client";
import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import programmingService from "@/app/services/programmingService";

export default function ProgrammingResolver({ params }) {
  const ejercicioId = params.id;

  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [tests, setTests] = useState([]);

  const usuarioId = "ID_DEL_USUARIO"; 

  useEffect(() => {
    programmingService.getTests(ejercicioId).then((r) => setTests(r.tests));
  }, []);

  const ejecutar = async () => {
    const res = await programmingService.execute({
      ejercicioId,
      usuarioId,
      codigo: code,
      lenguaje: "python",
      runOnly: true
    });

    setOutput(JSON.stringify(res, null, 2));
  };

  const guardar = async () => {
    const res = await programmingService.saveAttempt({
      ejercicioId,
      usuarioId,
      codigo: code,
      lenguaje: "python",
      runOnly: false
    });

    setOutput(JSON.stringify(res, null, 2));
  };

  return (
    <div>
      <h2>Resolver ejercicio</h2>

      <Editor
        height="400px"
        defaultLanguage="python"
        value={code}
        onChange={(v) => setCode(v || "")}
      />

      <button onClick={ejecutar}>Ejecutar (no guarda)</button>
      <button onClick={guardar}>Guardar intento</button>

      <pre>{output}</pre>
    </div>
  );
}
