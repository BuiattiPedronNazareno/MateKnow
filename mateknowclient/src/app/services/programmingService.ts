const API = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = () => {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const programmingService = {
  execute: async (payload: any) =>
    (await fetch(`${API}/programming/execute`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })).json(),

  saveAttempt: async (payload: any) =>
    (await fetch(`${API}/programming/attempts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })).json(),

  getAttempts: async (ejercicioId?: string, usuarioId?: string) => {
    const params = new URLSearchParams();
    if (ejercicioId) params.append('ejercicioId', ejercicioId);
    if (usuarioId) params.append('usuarioId', usuarioId);

    return (
      await fetch(`${API}/programming/attempts?${params.toString()}`, {
        headers: getAuthHeaders(),
      })
    ).json();
  },

  getTests: async (ejercicioId: string) =>
    (await fetch(`${API}/programming/exercises/${ejercicioId}/tests`, {
      headers: getAuthHeaders(),
    })).json(),

  createTest: async (ejercicioId: string, payload: any) =>
    (await fetch(`${API}/programming/exercises/${ejercicioId}/tests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })).json(),

  deleteTests: async (ejercicioId: string) =>
    fetch(`${API}/programming/exercises/${ejercicioId}/tests/delete-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }),

  updateExercise: async (id: string, payload: any) =>
    (await fetch(`${API}/ejercicio/programming/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })).json(),

  deleteExercise: async (id: string) =>
    fetch(`${API}/ejercicio/programming/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }),
};

export default programmingService;