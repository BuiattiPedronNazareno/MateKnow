import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: `${API_URL}`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface CreateEjercicioData {
  titulo?: string;
  enunciado?: string;
  metadata?: any;
  puntos?: number;
  tipo?: 'multiple-choice' | 'abierta' | 'verdadero-falso';
  opciones?: { texto: string; is_correcta?: boolean }[];
}

export interface CreateActividadData {
  nombre: string;
  descripcion: string;
  tipo?: 'evaluacion' | 'practica';
  fechaInicio?: string;
  fechaFin?: string;
  isVisible: boolean;
  ejercicioIds?: string[];
  nuevosEjercicios?: CreateEjercicioData[];
}

export const actividadService = {
  async crearActividad(claseId: string, data: CreateActividadData) {
    const res = await api.post(`/clases/${claseId}/actividades`, data);
    return res.data;
  },
  async listarActividades(claseId: string) {
    const res = await api.get(`/clases/${claseId}/actividades`);
    return res.data;
  },
  async eliminarActividad(claseId: string, actividadId: string) {
    const res = await api.delete(`/clases/${claseId}/actividades/${actividadId}`);
    return res.data;
  },
  async editarActividad(claseId: string, actividadId: string, data: Partial<CreateActividadData>) {
    const res = await api.put(`/clases/${claseId}/actividades/${actividadId}`, data);
    return res.data;
  },
  async listarEjercicios(claseId: string) {
    const res = await api.get(`/clases/${claseId}/actividades/ejercicios`);
    return res.data;
  }
  ,
  async iniciarIntento(claseId: string, actividadId: string) {
    const res = await api.post(`/clases/${claseId}/actividades/${actividadId}/iniciar`);
    return res.data;
  },
  async guardarRespuestas(claseId: string, actividadId: string, payload: { registroId: string; respuestas: Record<string, any> }) {
    const res = await api.post(`/clases/${claseId}/actividades/${actividadId}/respuestas`, payload);
    return res.data;
  },
  async finalizarIntento(claseId: string, actividadId: string, payload: { registroId: string }) {
    const res = await api.post(`/clases/${claseId}/actividades/${actividadId}/finalizar`, payload);
    return res.data;
  },
  async getHistorial(claseId: string, actividadId: string) {
    const res = await api.get(`/clases/${claseId}/actividades/${actividadId}/historial`);
    return res.data;
  }
};
