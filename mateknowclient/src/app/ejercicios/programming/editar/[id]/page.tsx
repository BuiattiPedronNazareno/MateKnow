"use client";

import { useEffect, useState } from "react";
import { ejercicioService } from "@/app/services/ejercicioService";
import { programmingService } from "@/app/services/programmingService";
import ProgramacionEditor from "@/app/components/ProgramacionEditor";

export default function EditarProgramming({ params }: { params: { id: string } }) {
  const { id } = params;

  const [ejercicio, setEjercicio] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>({});
  const [tests, setTests] = useState<any[]>([]);
  const [enunciado, setEnunciado] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const e = await ejercicioService.obtenerEjercicioPorId(id);
        const t = await programmingService.getTests(id);

        setEjercicio(e.ejercicio);
        setMetadata(e.ejercicio.metadata ?? {});
        setEnunciado(e.ejercicio.enunciado);
        setTests(t);
      } catch (err: any) {
        setError(err.message || 'Error al cargar ejercicio');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const guardar = async () => {
    try {
      await programmingService.updateExercise(id, {
        id,
        enunciado,
        metadata,
        puntos: ejercicio?.puntos ?? 1,
        tests
      });
      alert("Guardado correctamente");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!ejercicio) return <div>Ejercicio no encontrado</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Editar ejercicio de programación</h1>

      <ProgramacionEditor
        enunciado={enunciado}
        setEnunciado={setEnunciado}
        metadata={metadata}
        setMetadata={setMetadata}
        tests={tests}
        setTests={setTests}
      />

      <button onClick={guardar} style={{ marginTop: '20px' }}>
        Guardar Cambios
      </button>
    </div>
  );
}