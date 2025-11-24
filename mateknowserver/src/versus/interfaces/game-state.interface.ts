// ====================================
// ARCHIVO: src/versus/interfaces/game-state.interface.ts
// ====================================

export type GamePhase = 'selection' | 'answering' | 'finished';

export interface VersusQuestion {
  id: string;
  enunciado: string;
  opciones: string[];
  respuestaCorrecta: number; // índice de la opción correcta
  categoria?: string;
}

export interface PlayerAnswer {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  timeSeconds: number;
  points: number;
  answeredAt: Date;
}

export interface PlayerGameState {
  userId: string;
  nombre: string;
  apellido: string;
  socketId: string;
  selectedQuestions: string[];      // IDs que este jugador seleccionó para el rival
  hasFinishedSelection: boolean;
  assignedQuestions: string[];      // IDs que debe responder (seleccionadas por el rival)
  answers: PlayerAnswer[];
  hasFinishedAnswering: boolean;
  totalPoints: number;
  correctAnswers: number;
}

export interface GameState {
  lobbyId: string;
  claseId: string;                  // NUEVO: Clase de la partida
  phase: GamePhase;
  questions: VersusQuestion[];      // NUEVO: Pool de preguntas de esta partida
  player1: PlayerGameState;
  player2: PlayerGameState;
  currentTurn: string | null;       // userId del jugador en turno (null en answering)
  turnStartedAt?: Date;
  selectionTimeLimit: number;       // segundos (20)
  answeringTimeLimit: number;       // segundos (90)
  answeringStartedAt?: Date;
  createdAt: Date;
  finishedAt?: Date;
  winnerId?: string;
  isDraw?: boolean;
}