import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:4000';

// Cliente axios configurado
const api = axios.create({
  baseURL: `${API_URL}/versus`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Agregar token automáticamente a todas las requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Clase para manejar la conexión WebSocket y llamadas REST
 */
class VersusService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private currentMatchData: any = null;

  /**
   * Conecta al WebSocket del servidor
   */
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.token = localStorage.getItem('access_token');

    if (!this.token) {
      throw new Error('No hay token de autenticación');
    }

    this.socket = io(`${API_URL}/versus`, {
      query: { token: this.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Event listeners
    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ WebSocket desconectado:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error.message);
    });

    this.socket.on('match-found', (data) => {
      console.log('🎯 Match encontrado, guardando datos...', data);
      this.currentMatchData = data;
    });

    return this.socket;
  }

  /**
   * Obtiene los datos del match actual
   */
  getCurrentMatchData(): any {
    return this.currentMatchData;
  }

  /**
   * Limpia los datos del match actual
   */
  clearCurrentMatchData(): void {
    this.currentMatchData = null;
  }

  /**
   * Desconecta el WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Obtiene el socket actual
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Busca una partida
   */
  searchMatch(): void {
    if (!this.socket) {
      throw new Error('Socket no conectado');
    }
    this.socket.emit('search-match', {});
  }

  /**
   * Cancela la búsqueda de partida
   */
  cancelSearch(): void {
    if (!this.socket) {
      throw new Error('Socket no conectado');
    }
    this.socket.emit('cancel-search', {});
  }

  /**
   * Selecciona una pregunta
   */
  selectQuestion(lobbyId: string, questionId: string): void {
    if (!this.socket) {
      throw new Error('Socket no conectado');
    }
    this.socket.emit('select-question', { lobbyId, questionId });
  }

  /**
   * Responde una pregunta
   */
  answerQuestion(
    lobbyId: string,
    questionId: string,
    selectedOption: number,
    timeSeconds: number,
  ): void {
    if (!this.socket) {
      throw new Error('Socket no conectado');
    }
    this.socket.emit('answer-question', {
      lobbyId,
      questionId,
      selectedOption,
      timeSeconds,
    });
  }

  /**
   * Obtiene todas las preguntas (REST)
   */
  async getQuestions() {
    const response = await api.get('/questions');
    return response.data;
  }

  /**
   * Obtiene el estado actual del usuario (REST)
   */
  async getStatus() {
    const response = await api.get('/status');
    return response.data;
  }

  /**
   * Obtiene el estado de una lobby (REST)
   */
  async getLobby(lobbyId: string) {
    const response = await api.get(`/lobby/${lobbyId}`);
    return response.data;
  }

  /**
   * Abandona la partida actual (REST)
   */
  async leaveMatch() {
    const response = await api.post('/leave');
    return response.data;
  }

  /**
   * Registra listeners de eventos
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.socket) {
      throw new Error('Socket no conectado');
    }
    this.socket.on(event, callback);
  }

  /**
   * Remueve listener de evento
   */
  off(event: string, callback?: (data: any) => void): void {
    if (!this.socket) {
      return;
    }
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }
}

// Exportar instancia única (singleton)
const versusService = new VersusService();
export default versusService;