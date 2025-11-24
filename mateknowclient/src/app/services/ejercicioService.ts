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

export interface ProgrammingMetadata {
  lenguaje: string;
  boilerplate?: string;
  version?: string;
  timeout?: number;
}

export interface ProgrammingTestCase {
  stdin?: string;
  expected: string;
  weight?: number;
  timeout_seconds?: number;
  public?: boolean;
}

export interface CreateProgrammingExerciseData {
  tipoId: string;
  enunciado: string;
  puntos?: number;
  metadata: ProgrammingMetadata;
  tests: ProgrammingTestCase[];
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

  async crearEjercicioProgramacion(
    data: CreateProgrammingExerciseData
  ): Promise<{ message: string; ejercicio: any }> {
    try {
      if (!data.tipoId || !data.enunciado?.trim()) {
        throw new Error('TipoId y enunciado son obligatorios');
      }

      if (!data.metadata?.lenguaje?.trim()) {
        throw new Error('El lenguaje es obligatorio');
      }

      if (!data.tests || data.tests.length === 0) {
        throw new Error('Debe agregar al menos un caso de prueba');
      }

      for (let i = 0; i < data.tests.length; i++) {
        if (!data.tests[i].expected?.trim()) {
          throw new Error(`El caso de prueba ${i + 1} debe tener una salida esperada`);
        }
      }

      console.log('📤 Enviando ejercicio de programación:', data);

      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_URL}/ejercicio/programming/create`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      console.log('✅ Respuesta del servidor:', response.data);
      return response.data;

    } catch (error: any) {
      console.error('❌ Error al crear ejercicio de programación:', error);
      
      if (error.response) {
        const message = error.response.data?.message || 'Error del servidor';
        throw new Error(message);
      } else if (error.request) {
        throw new Error('No se recibió respuesta del servidor');
      } else {
        throw new Error(error.message || 'Error al crear ejercicio de programación');
      }
    }
  },

  async obtenerEjercicioProgramacion(id: string): Promise<{
    ejercicio: any;
    testCases: any[];
  }> {
    try {
      const token = localStorage.getItem('access_token');
      
      const ejercicioResponse = await axios.get(
        `${API_URL}/ejercicios/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const testCasesResponse = await axios.get(
        `${API_URL}/programming/exercises/${id}/tests`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return {
        ejercicio: ejercicioResponse.data.ejercicio,
        testCases: testCasesResponse.data || [],
      };
    } catch (error: any) {
      console.error('Error al obtener ejercicio de programación:', error);
      throw new Error(
        error.response?.data?.message || 'Error al obtener ejercicio de programación'
      );
    }
  },

  async actualizarEjercicioProgramacion(
    id: string,
    data: {
      enunciado?: string;
      puntos?: number;
      metadata?: ProgrammingMetadata;
      tests?: ProgrammingTestCase[];
    }
  ): Promise<{ message: string }> {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.put(
        `${API_URL}/ejercicio/programming/${id}`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar ejercicio de programación:', error);
      throw new Error(
        error.response?.data?.message || 'Error al actualizar ejercicio de programación'
      );
    }
  },
};