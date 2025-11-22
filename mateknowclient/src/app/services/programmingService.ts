const API = process.env.NEXT_PUBLIC_API_URL;

export const programmingService = {
  execute: async (payload) =>
    (await fetch(`${API}/programming/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })).json(),

  saveAttempt: async (payload) =>
    (await fetch(`${API}/programming/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })).json(),

  getAttempts: async (ejercicioId, usuarioId) => {
    const url = new URL(`${API}/programming/attempts`);
    if (ejercicioId) url.searchParams.append("ejercicioId", ejercicioId);
    if (usuarioId) url.searchParams.append("usuarioId", usuarioId);
    return (await fetch(url)).json();
  },

  getTests: async (ejercicioId) =>
    (await fetch(`${API}/programming/exercises/${ejercicioId}/tests`)).json(),

  createTest: async (ejercicioId, payload) =>
    (await fetch(`${API}/programming/exercises/${ejercicioId}/tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })).json(),

  deleteTests: async (ejercicioId) =>
    fetch(`${API}/programming/exercises/${ejercicioId}/tests/delete-all`, {
      method: "POST",
    }),
};
