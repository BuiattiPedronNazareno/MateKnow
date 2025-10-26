import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: `${API_URL}/usuarios`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rolId: number;
}

export interface Perfil extends Usuario {
  createdAt: string;
}

export interface Estadisticas {
  clasesComoProfesor: number;
  clasesComoAlumno: number;
  totalClases: number;
}

export const usuarioService = {
  /**
   * Buscar usuario por email
   */
  async buscarPorEmail(email: string): Promise<{ usuario: Usuario }> {
    const response = await api.get('/buscar', {
      params: { email },
    });
    return response.data;
  },

  /**
   * Buscar usuarios por nombre
   */
  async buscarPorNombre(nombre: string): Promise<{ usuarios: Usuario[] }> {
    const response = await api.get('/buscar', {
      params: { nombre },
    });
    return response.data;
  },

  /**
   * Obtener perfil del usuario actual
   */
  async getPerfil(): Promise<{ usuario: Perfil }> {
    const response = await api.get('/perfil');
    return response.data;
  },

  /**
   * Actualizar perfil del usuario actual
   */
  async updatePerfil(data: {
    nombre?: string;
    apellido?: string;
  }): Promise<{ message: string; usuario: Usuario }> {
    const response = await api.put('/perfil', data);
    return response.data;
  },

  /**
   * Obtener estadísticas del usuario
   */
  async getEstadisticas(): Promise<{ estadisticas: Estadisticas }> {
    const response = await api.get('/estadisticas');
    return response.data;
  },
};