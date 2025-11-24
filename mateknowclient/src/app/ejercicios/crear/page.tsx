import { Suspense } from "react";
import CrearEjercicioPageClient from "./CrearEjercicioPageClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <CrearEjercicioPageClient />
    </Suspense>
  );
}

