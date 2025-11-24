// ====================================
// ARCHIVO: src/app/services/versusService.ts
// ====================================

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface VersusQuestion {
  id: string;
  enunciado: string;
  opciones: string[];
  respuestaCorrecta?: number; // Solo disponible en revisión
  categoria?: string;
}

export interface MatchData {
  lobbyId: string;
  claseId: string;
  opponent: { nombre: string; apellido: string };
  currentTurn: string;
  yourTurn: boolean;
  phase: 'selection' | 'answering' | 'finished';
  questions: VersusQuestion[];
}

export interface MatchResult {
  lobbyId: string;
  phase: 'finished';
  winner: { userId: string; nombre: string; apellido: string; points: number } | null;
  isDraw: boolean;
  youWon: boolean;
  player1: PlayerResult;
  player2: PlayerResult;
}

export interface PlayerResult {
  userId: string;
  nombre: string;
  apellido: string;
  totalPoints: number;
  correctAnswers: number;
  answers: any[];
}

class VersusService {
  private socket: Socket | null = null;
  private currentMatchData: MatchData | null = null;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    this.socket = io(`${SOCKET_URL}/versus`, {
      query: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Conectado a Versus WebSocket');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado de Versus:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión:', error.message);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentMatchData = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // ========================================
  // ACCIONES DEL JUGADOR
  // ========================================

  /**
 * Valida si una clase tiene preguntas suficientes para Versus
 */
  async validateClass(claseId: string): Promise<{ valido: boolean; cantidad: number; mensaje: string }> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    try {
      const response = await fetch(`${API_URL}/versus/validate-class?claseId=${claseId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error validando clase');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en validateClass:', error);
      throw error;
    }
  }

  /**
   * Buscar partida en una clase específica
   */
  searchMatch(claseId: string): void {
    if (!this.socket) {
      throw new Error('Socket no conectado');
    }
    this.socket.emit('search-match', { claseId });
  }

  cancelSearch(): void {
    if (!this.socket) return;
    this.socket.emit('cancel-search');
  }

  selectQuestion(lobbyId: string, questionId: string): void {
    if (!this.socket) return;
    this.socket.emit('select-question', { lobbyId, questionId });
  }

  answerQuestion(
    lobbyId: string,
    questionId: string,
    selectedOption: number,
    timeSeconds: number
  ): void {
    if (!this.socket) return;
    this.socket.emit('answer-question', {
      lobbyId,
      questionId,
      selectedOption,
      timeSeconds,
    });
  }

  // ========================================
  // GESTIÓN DE DATOS DE PARTIDA
  // ========================================

  setCurrentMatchData(data: MatchData): void {
    this.currentMatchData = data;
  }

  getCurrentMatchData(): MatchData | null {
    return this.currentMatchData;
  }

  clearMatchData(): void {
    this.currentMatchData = null;
  }

  // ========================================
  // LISTENERS HELPER
  // ========================================

  onConnected(callback: (data: any) => void): void {
    this.socket?.on('connected', callback);
  }

  onSearching(callback: (data: any) => void): void {
    this.socket?.on('searching', callback);
  }

  onSearchCancelled(callback: (data: any) => void): void {
    this.socket?.on('search-cancelled', callback);
  }

  onMatchFound(callback: (data: MatchData) => void): void {
    this.socket?.on('match-found', (data) => {
      this.setCurrentMatchData(data);
      callback(data);
    });
  }

  onQuestionSelected(callback: (data: any) => void): void {
    this.socket?.on('question-selected', callback);
  }

  onOpponentSelected(callback: (data: any) => void): void {
    this.socket?.on('opponent-selected', callback);
  }

  onAnsweringPhaseStart(callback: (data: any) => void): void {
    this.socket?.on('answering-phase-start', callback);
  }

  onAnswerRecorded(callback: (data: any) => void): void {
    this.socket?.on('answer-recorded', callback);
  }

  onOpponentProgress(callback: (data: any) => void): void {
    this.socket?.on('opponent-progress', callback);
  }

  onMatchFinished(callback: (data: MatchResult) => void): void {
    this.socket?.on('match-finished', callback);
  }

  onOpponentDisconnected(callback: (data: any) => void): void {
    this.socket?.on('opponent-disconnected', callback);
  }

  onError(callback: (data: { message: string }) => void): void {
    this.socket?.on('error', callback);
  }

  // Limpiar todos los listeners
  removeAllListeners(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners('connected');
    this.socket.removeAllListeners('searching');
    this.socket.removeAllListeners('search-cancelled');
    this.socket.removeAllListeners('match-found');
    this.socket.removeAllListeners('question-selected');
    this.socket.removeAllListeners('opponent-selected');
    this.socket.removeAllListeners('answering-phase-start');
    this.socket.removeAllListeners('answer-recorded');
    this.socket.removeAllListeners('opponent-progress');
    this.socket.removeAllListeners('match-finished');
    this.socket.removeAllListeners('opponent-disconnected');
    this.socket.removeAllListeners('error');
  }
}

// Singleton
export const versusService = new VersusService();