import { Suspense } from "react";
import VersusLobbyClient from "./VersusLobbyClient";

export default function VersusPage() {
  return (
    <Suspense fallback={<div>Cargando Versus...</div>}>
      <VersusLobbyClient />
    </Suspense>
  );
}

