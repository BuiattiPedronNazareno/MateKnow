export interface VersusQuestion {
  id: string;               // ID único de la pregunta
  enunciado: string;        // Texto de la pregunta
  opciones: string[];       // Array de 4 opciones
  respuestaCorrecta: number; // Índice de la respuesta correcta (0-3)
  categoria?: string;       // Categoría opcional
}

/**
 * Selección de pregunta por un jugador
 */
export interface QuestionSelection {
  questionId: string;       // ID de la pregunta seleccionada
  selectedBy: string;       // userId del jugador que la seleccionó
  assignedTo: string;       // userId del jugador que debe responderla
  order: number;            // Orden de selección (1-5)
}

/**
 * Respuesta de un jugador a una pregunta
 */
export interface PlayerAnswer {
  questionId: string;       // ID de la pregunta respondida
  selectedOption: number;   // Opción elegida (0-3)
  isCorrect: boolean;       // ¿Es correcta?
  timeSeconds: number;      // Tiempo que tardó en responder
  points: number;           // Puntos obtenidos (incluye bonus)
  answeredAt: Date;         // Timestamp de respuesta
}

/**
 * Estado de un jugador en la partida
 */
export interface PlayerGameState {
  userId: string;           
  nombre: string;
  apellido: string;
  socketId: string;
  
  // Fase de selección
  selectedQuestions: string[];     // IDs de preguntas seleccionadas (máx 5)
  hasFinishedSelection: boolean;   // ¿Terminó de seleccionar?
  
  // Fase de respuesta
  assignedQuestions: string[];     // IDs de preguntas asignadas
  answers: PlayerAnswer[];         // Respuestas dadas
  hasFinishedAnswering: boolean;   // ¿Terminó de responder?
  
  // Puntaje
  totalPoints: number;             // Puntos totales acumulados
  correctAnswers: number;          // Cantidad de respuestas correctas
}

/**
 * Fases del juego
 */
export enum GamePhase {
  WAITING = 'waiting',             // Esperando jugadores
  SELECTION = 'selection',         // Seleccionando preguntas
  ANSWERING = 'answering',         // Respondiendo preguntas
  FINISHED = 'finished',           // Partida terminada
  CANCELLED = 'cancelled'          // Partida cancelada
}

/**
 * Estado completo de una lobby/partida
 */
export interface GameState {
  lobbyId: string;                 // ID único de la lobby
  phase: GamePhase;                // Fase actual del juego
  
  // Jugadores
  player1: PlayerGameState;
  player2: PlayerGameState;
  
  // Turnos (para fase de selección)
  currentTurn: string;             // userId del jugador en turno
  turnStartedAt?: Date;            // Timestamp inicio del turno
  
  // Temporizadores
  selectionTimeLimit: number;      // Segundos por turno (20s)
  answeringTimeLimit: number;      // Segundos totales para responder (90s)
  answeringStartedAt?: Date;       // Timestamp inicio fase respuesta
  
  // Timestamps generales
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  
  // Resultado
  winnerId?: string;               // userId del ganador
  isDraw?: boolean;                // ¿Es empate?
}

/**
 * Resultado final de la partida para guardar en BD
 */
export interface MatchResult {
  lobbyId: string;
  jugador1Id: string;
  jugador2Id: string;
  ganadorId: string | null;
  puntosJugador1: number;
  puntosJugador2: number;
  estado: 'completada' | 'cancelada';
  fechaInicio: Date;
  fechaFin: Date;
}