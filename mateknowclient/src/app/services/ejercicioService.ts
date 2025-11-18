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
};