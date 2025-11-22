"use client";

import { useEffect, useState } from "react";
import { programmingService } from "@/app/services/programmingService";

export default function IntentosProfesor({ params }) {
  const id = params.id;
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    programmingService.getAttempts(id).then((r) => setAttempts(r));
  }, []);

  return (
    <div>
      <h1>Intentos</h1>
      {attempts.map((a) => (
        <div key={a.id}>
          <h3>{a.usuario_id}</h3>
          <pre>{a.codigo}</pre>
          <pre>{JSON.stringify(a.tests_result, null, 2)}</pre>
          <p>Score: {a.score}</p>
        </div>
      ))}
    </div>
  );
}
