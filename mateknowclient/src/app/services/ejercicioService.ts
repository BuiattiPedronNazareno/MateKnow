import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: `${API_URL}/ejercicios`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface TipoEjercicio {
  id: string;
  key: string;
  nombre: string;
  descripcion?: string;
}

export interface Opcion {
  id?: string;
  texto: string;
  isCorrecta: boolean;
}

export interface Ejercicio {
  id: string;
  enunciado: string;
  puntos: number;
  isVersus: boolean;
  tipo: TipoEjercicio;
  opciones: Opcion[];
  creadoAt: string;
}

export interface CreateEjercicioData {
  tipoId: string;
  enunciado: string;
  puntos?: number;
  isVersus?: boolean;
  opciones: Opcion[];
}

export interface UpdateEjercicioData {
  enunciado?: string;
  puntos?: number;
  isVersus?: boolean;
  opciones?: Opcion[];
}

export const ejercicioService = {
  async crearEjercicio(data: CreateEjercicioData): Promise<{ message: string; ejercicio: Ejercicio }> {
    const response = await api.post('/', data);
    return response.data;
  },

  async obtenerMisEjercicios(): Promise<{ ejercicios: Ejercicio[] }> {
    const response = await api.get('/');
    return response.data;
  },

  async obtenerEjercicioPorId(id: string): Promise<{ ejercicio: Ejercicio }> {
    const response = await api.get(`/${id}`);
    return response.data;
  },

  async actualizarEjercicio(id: string, data: UpdateEjercicioData): Promise<{ message: string }> {
    const response = await api.put(`/${id}`, data);
    return response.data;
  },

  async obtenerTiposEjercicio(): Promise<{ tipos: TipoEjercicio[] }> {
    const response = await api.get('/tipos');
    return response.data;
  },

  async crearTipoEjercicio(data: { key: string; nombre: string; descripcion?: string }): Promise<{ message: string; tipo: TipoEjercicio }> {
    const response = await api.post('/tipos', data);
    return response.data;
  },

  async actualizarTipoEjercicio(id: string, data: { nombre?: string; descripcion?: string }): Promise<{ message: string }> {
    const response = await api.put(`/tipos/${id}`, data);
    return response.data;
  },

  async eliminarTipoEjercicio(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/tipos/${id}`);
    return response.data;
  },

  async eliminarEjercicio(id: string, deleteActividades = false): Promise<{ message: string; actividadesEliminadas?: number }> {
    const response = await api.delete(`/${id}`, { params: { deleteActividades } });
    return response.data;
  },

  async crearEjercicioProgramacion(data: {
    tipoId: string;
    enunciado: string;
    puntos: number;
    metadata: any;
    tests: any[];
  }): Promise<{ ok: boolean; ejercicio: any }> {
    const token = localStorage.getItem('access_token');
    console.log("DATA A ENVIAR:", data);
    const response = await fetch(`${API_URL}/ejercicio/programming/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al crear ejercicio de programación');
    }

    return response.json();
  },
};