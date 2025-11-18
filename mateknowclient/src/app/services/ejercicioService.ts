import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: `${API_URL}/ejercicios`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('ejercicioService - Error 401:', error.response.data);
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
  creadoAt?: string;
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
  async createEjercicio(data: CreateEjercicioData): Promise<any> {
    const response = await api.post('/', data);
    return response.data;
  },


  async getMisEjercicios(): Promise<{ ejercicios: Ejercicio[] }> {
    const response = await api.get('/');
    return response.data;
  },

  async getTiposEjercicio(): Promise<{ tipos: TipoEjercicio[] }> {
    const response = await api.get('/tipos');
    return response.data;
  },
  
  async getEjercicioById(id: string): Promise<{ ejercicio: Ejercicio }> {
    const response = await api.get(`/${id}`);
    return response.data;
  },

  async updateEjercicio(id: string, data: UpdateEjercicioData): Promise<any> {
    const response = await api.put(`/${id}`, data);
    return response.data;
  },

  async deleteEjercicio(id: string, deleteActividades: boolean = false): Promise<any> {
    const response = await api.delete(`/${id}`, {
      params: { deleteActividades: deleteActividades.toString() },
    });
    return response.data;
  },
};