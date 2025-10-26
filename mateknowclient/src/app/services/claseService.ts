import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: `${API_URL}/clases`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      console.log('claseService - Token encontrado:', token ? 'Sí' : 'No');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('claseService - Authorization header:', config.headers.Authorization?.substring(0, 20) + '...');
      } else {
        console.error('claseService - No hay token en localStorage');
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
      console.error('claseService - Error 401:', error.response.data);
      // No redirigir aquí, dejar que lo maneje el authService
    }
    return Promise.reject(error);
  }
);

export interface Clase {
  id: string;
  nombre: string;
  descripcion: string;
  codigo: string;
  isPublico: boolean;
  isProfesor: boolean;
  fechaInscripcion: string;
  creadorId?: string;
}

export interface ClaseDetalle extends Clase {
  profesores: Usuario[];
  alumnos: Usuario[];
}

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

export interface CreateClaseData {
  nombre: string;
  descripcion: string;
  isPublico?: boolean;
}

export interface UpdateClaseData {
  nombre?: string;
  descripcion?: string;
  isPublico?: boolean;
}

export interface JoinClaseData {
  codigo: string;
}

export const claseService = {
  // CA2: Crear una nueva clase
  async createClase(data: CreateClaseData): Promise<any> {
    console.log('claseService.createClase - Datos:', data);
    const response = await api.post('/', data);
    return response.data;
  },

  // CA1: Unirse a una clase con código
  async joinClase(data: JoinClaseData): Promise<any> {
    const response = await api.post('/join', data);
    return response.data;
  },

  // Obtener todas las clases del usuario
  async getMisClases(): Promise<{ clases: Clase[] }> {
    console.log('claseService.getMisClases - Iniciando petición...');
    const response = await api.get('/');
    return response.data;
  },

  // Obtener detalles de una clase
  async getClaseById(id: string): Promise<{ clase: ClaseDetalle; profesores: Usuario[]; alumnos: Usuario[] }> {
    const response = await api.get(`/${id}`);
    return response.data;
  },

  // CA4: Actualizar configuración de la clase
  async updateClase(id: string, data: UpdateClaseData): Promise<any> {
    const response = await api.put(`/${id}`, data);
    return response.data;
  },

  // CA5: Agregar otro profesor
  async addProfesor(claseId: string, usuarioId: string): Promise<any> {
    const response = await api.post(`/${claseId}/profesores`, { usuarioId });
    return response.data;
  },

  // Matricular alumno manualmente (clases privadas)
  async matricularAlumno(claseId: string, usuarioId: string): Promise<any> {
    console.log('claseService.matricularAlumno - claseId:', claseId, 'usuarioId:', usuarioId);
    const response = await api.post(`/${claseId}/alumnos`, { usuarioId });
    return response.data;
  },

  // Eliminar una clase
  async deleteClase(id: string): Promise<any> {
    const response = await api.delete(`/${id}`);
    return response.data;
  },

  // Salir de una clase
  async salirDeClase(id: string): Promise<any> {
    const response = await api.post(`/${id}/salir`);
    return response.data;
  },
};