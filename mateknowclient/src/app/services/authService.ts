import axios from 'axios';

// Configura la URL base de tu backend
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: `${API_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    rol_id: number;
  };
  session: {
    access_token: string;
    refresh_token: string;
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
    
    // Guardar tokens en localStorage
    if (response.data.session) {
      localStorage.setItem('access_token', response.data.session.access_token);
      localStorage.setItem('refresh_token', response.data.session.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
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
    
    const response = await api.post('/validate', null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    return response.data;
  },

  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};