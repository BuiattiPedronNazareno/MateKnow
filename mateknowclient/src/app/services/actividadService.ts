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

export interface Intento {
  id: string;
  actividad_id: string;
  estado: 'in_progress' | 'finished';
  respuestas: any[];
  puntaje?: number;
  started_at: string;
}

export const actividadService = {

  // --- GESTIÓN (Profesor) ---

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
  },
  async getHistorial(claseId: string, actividadId: string) {
    const res = await api.get(`/clases/${claseId}/actividades/${actividadId}/historial`);
    return res.data;
  },

  // --- ALUMNO (Realización y Revisión) ---

  // 1. Obtener detalle para rendir (Sin respuestas correctas)
  // URL: /clases/:claseId/actividades/:id
  async getActividadById(claseId: string, actividadId: string): Promise<{ actividad: any }> {
    const response = await api.get(`/clases/${claseId}/actividades/${actividadId}`);
    return response.data;
  },

  // 2. Iniciar Intento
  // URL: /clases/:claseId/actividades/:id/iniciar
  async iniciarIntento(claseId: string, actividadId: string): Promise<{ message: string; intento: Intento }> {
    const response = await api.post(`/clases/${claseId}/actividades/${actividadId}/iniciar`);
    return response.data;
  },

  // 3. Guardar Respuesta Parcial (Autosave)
  // URL: /clases/:claseId/actividades/intento/:intentoId/respuesta
  // Nota: La ruta en el controller es 'intento/:id/respuesta' bajo el prefijo 'clases/:claseId/actividades'
  async guardarRespuesta(claseId: string, intentoId: string, ejercicioId: string, respuesta: any): Promise<void> {
    await api.put(`/clases/${claseId}/actividades/intento/${intentoId}/respuesta`, { ejercicioId, respuesta });
  },

  // 4. Finalizar Intento
  // URL: /clases/:claseId/actividades/intento/:intentoId/finalizar
  async finalizarIntento(claseId: string, intentoId: string, respuestas?: any[]): Promise<{ message: string; puntaje: number }> {
    const response = await api.post(`/clases/${claseId}/actividades/intento/${intentoId}/finalizar`, { respuestas });
    return response.data;
  },

  // 5. Obtener Revisión (Con respuestas correctas)
  // URL: /clases/:claseId/actividades/:id/revision
  async getRevision(claseId: string, actividadId: string, intentoId?: string): Promise<{ actividad: any; intento: Intento }> {
    const params = intentoId ? { intentoId } : {};
    const response = await api.get(`/clases/${claseId}/actividades/${actividadId}/revision`, { params });
    return response.data;
  },

  // 6. Obtener Historial de Intentos
  // URL: /clases/:claseId/actividades/:id/historial
  async getHistorialIntentos(claseId: string, actividadId: string): Promise<{ intentos: any[] }> {
    const response = await api.get(`/clases/${claseId}/actividades/${actividadId}/historial`);
    return response.data;
  },

  async getIntentosPorActividad(claseId: string, actividadId: string) {
    const res = await api.get(`/clases/${claseId}/actividades/${actividadId}/intentos`);
    return res.data;
  },

  // Enviar corrección manual
  async corregirRespuesta(claseId: string, actividadId: string, intentoId: string, ejercicioId: string, puntaje: number) {
    const res = await api.post(`/clases/${claseId}/actividades/${actividadId}/corregir`, {
      intentoId, ejercicioId, puntaje
    });
    return res.data;
  }
};