import axios from 'axios';

// Configura la URL base de tu backend
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: `${API_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores 401 (token expirado/inválido)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado - limpiar y redirigir
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      // Solo redirigir si no estamos ya en login/register
      if (typeof window !== 'undefined' &&
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  alias: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role?: string;
    user_metadata?: {
      nombre?: string;
      apellido?: string;
      email?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    rol_id: number;
  };
}

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/login', data);

    // DEBUG: Ver estructura de la respuesta
    console.log('authService.login - response.data:', response.data);

    // El backend devuelve accessToken y refreshToken directamente (no en session)
    if (response.data.accessToken && response.data.user) {
      console.log('Guardando tokens...');
      localStorage.setItem('access_token', response.data.accessToken);
      localStorage.setItem('refresh_token', response.data.refreshToken);

      // Adaptar el formato del usuario para que coincida con lo que espera el frontend
      const userData = {
        id: response.data.user.id,
        email: response.data.user.email,
        nombre: response.data.user.nombre || response.data.user.user_metadata?.nombre || response.data.user.email.split('@')[0],
        apellido: response.data.user.apellido || response.data.user.user_metadata?.apellido || '',
        alias: response.data.user.alias || '',
        rol_id: 1, // Valor por defecto
      };

      localStorage.setItem('user', JSON.stringify(userData));

      // Verificar que se guardaron
      console.log('Token guardado:', localStorage.getItem('access_token') ? 'Sí' : 'No');
      console.log('User guardado:', localStorage.getItem('user'));

      // IMPORTANTE: Esperar un momento para asegurar que localStorage se sincronice
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      console.error('No hay accessToken en la respuesta del backend');
      console.error('Estructura recibida:', JSON.stringify(response.data, null, 2));
    }

    return response.data;
  },

  async register(data: RegisterData): Promise<RegisterResponse> {
    const response = await api.post('/register', data);
    return response.data;
  },

  async logout(): Promise<void> {
    const token = localStorage.getItem('access_token');

    if (token) {
      try {
        await api.post('/logout', { access_token: token });
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
    }

    // Limpiar localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  async validateToken(): Promise<any> {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('No hay token');
    }

    try {
      const response = await api.post('/validate', null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      // Si falla la validación, limpiar el token
      this.clearAuth();
      throw error;
    }
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('access_token');
    } catch {
      return null;
    }
  },

  getUser(): any {
    if (typeof window === 'undefined') return null;
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!this.getToken();
  },

  clearAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },
};