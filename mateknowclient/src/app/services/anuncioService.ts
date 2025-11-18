import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: `${API_URL}/anuncios`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token
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

// Interceptor para manejar errores 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // No redirigir aquí, dejar que lo maneje el authService
    }
    return Promise.reject(error);
  }
);

export interface Anuncio {
  id: string;
  titulo: string;
  descripcion: string;
  fechaPublicacion: string;
  autor: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnuncioData {
  titulo: string;
  descripcion: string;
}

export interface UpdateAnuncioData {
  titulo?: string;
  descripcion?: string;
}

export const anuncioService = {
 
  async createAnuncio(claseId: string, data: CreateAnuncioData): Promise<{ message: string; anuncio: Anuncio }> {
    const response = await api.post(`/clase/${claseId}`, data);
    return response.data;
  },

  async getAnunciosByClase(claseId: string): Promise<{ anuncios: Anuncio[] }> {
    const response = await api.get(`/clase/${claseId}`);
    return response.data;
  },


  async getAnuncioById(anuncioId: string): Promise<{ anuncio: Anuncio }> {
    const response = await api.get(`/${anuncioId}`);
    return response.data;
  },

  async updateAnuncio(anuncioId: string, data: UpdateAnuncioData): Promise<{ message: string; anuncio: Anuncio }> {
    const response = await api.put(`/${anuncioId}`, data);
    return response.data;
  },

  async deleteAnuncio(anuncioId: string): Promise<{ message: string }> {
    const response = await api.delete(`/${anuncioId}`);
    return response.data;
  },
};