// ====================================
// ARCHIVO: src/versus/versus.service.ts
// ====================================

import { Injectable, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
import { 
  GameState,  
  GamePhase, 
  PlayerGameState,
  VersusQuestion 
} from './interfaces/game-state.interface';
import { PlayerSession } from './interfaces/player-session.interface';
/**
 * Servicio principal del Modo Versus
 * Gestiona lobbies, matchmaking y estado del juego en Redis
 */
@Injectable()
export class VersusService {
  private readonly logger = new Logger(VersusService.name);
  private redisClient: RedisClientType;
  
  // Preguntas hardcodeadas (por ahora)
  private readonly QUESTIONS: VersusQuestion[] = [
    {
      id: 'q1',
      enunciado: '¿Cuánto es 2 + 2?',
      opciones: ['3', '4', '5', '6'],
      respuestaCorrecta: 1,
      categoria: 'Aritmética'
    },
    {
      id: 'q2',
      enunciado: '¿Cuál es la raíz cuadrada de 16?',
      opciones: ['2', '4', '8', '16'],
      respuestaCorrecta: 1,
      categoria: 'Raíces'
    },
    {
      id: 'q3',
      enunciado: '¿Cuánto es 5 × 7?',
      opciones: ['30', '35', '40', '45'],
      respuestaCorrecta: 1,
      categoria: 'Multiplicación'
    },
    {
      id: 'q4',
      enunciado: '¿Cuánto es 100 ÷ 4?',
      opciones: ['20', '25', '30', '35'],
      respuestaCorrecta: 1,
      categoria: 'División'
    },
    {
      id: 'q5',
      enunciado: '¿Cuál es el valor de π redondeado?',
      opciones: ['3.12', '3.14', '3.16', '3.18'],
      respuestaCorrecta: 1,
      categoria: 'Constantes'
    },
    {
      id: 'q6',
      enunciado: '¿Cuánto es 2³?',
      opciones: ['4', '6', '8', '10'],
      respuestaCorrecta: 2,
      categoria: 'Potencias'
    },
    {
      id: 'q7',
      enunciado: '¿Cuántos grados tiene un triángulo?',
      opciones: ['90°', '180°', '270°', '360°'],
      respuestaCorrecta: 1,
      categoria: 'Geometría'
    },
    {
      id: 'q8',
      enunciado: '¿Cuánto es 15% de 200?',
      opciones: ['20', '25', '30', '35'],
      respuestaCorrecta: 2,
      categoria: 'Porcentajes'
    },
    {
      id: 'q9',
      enunciado: '¿Cuál es el resultado de |−5|?',
      opciones: ['−5', '0', '5', '10'],
      respuestaCorrecta: 2,
      categoria: 'Valor absoluto'
    },
    {
      id: 'q10',
      enunciado: '¿Cuánto es 12 − 7?',
      opciones: ['3', '4', '5', '6'],
      respuestaCorrecta: 2,
      categoria: 'Resta'
    },
    {
      id: 'q11',
      enunciado: '¿Cuántos lados tiene un hexágono?',
      opciones: ['4', '5', '6', '7'],
      respuestaCorrecta: 2,
      categoria: 'Geometría'
    },
    {
      id: 'q12',
      enunciado: '¿Cuánto es 9²?',
      opciones: ['18', '72', '81', '90'],
      respuestaCorrecta: 2,
      categoria: 'Potencias'
    },
    {
      id: 'q13',
      enunciado: '¿Cuál es el mínimo común múltiplo de 4 y 6?',
      opciones: ['8', '10', '12', '24'],
      respuestaCorrecta: 2,
      categoria: 'MCM'
    },
    {
      id: 'q14',
      enunciado: '¿Cuánto es 3/4 en decimal?',
      opciones: ['0.25', '0.5', '0.75', '1.0'],
      respuestaCorrecta: 2,
      categoria: 'Fracciones'
    },
    {
      id: 'q15',
      enunciado: '¿Cuántos minutos hay en 2.5 horas?',
      opciones: ['120', '130', '150', '180'],
      respuestaCorrecta: 2,
      categoria: 'Conversiones'
    },
    {
      id: 'q16',
      enunciado: '¿Cuál es el área de un cuadrado de lado 5?',
      opciones: ['10', '20', '25', '30'],
      respuestaCorrecta: 2,
      categoria: 'Área'
    }
  ];

  constructor(private configService: ConfigService) {
    this.initRedis();
  }

  /**
   * Inicializa la conexión con Redis Cloud
   */
  private async initRedis() {
    try {
      this.redisClient = createClient({
        socket: {
          host: this.configService.get<string>('REDIS_HOST'),
          port: this.configService.get<number>('REDIS_PORT'),
        },
        password: this.configService.get<string>('REDIS_PASSWORD'),
      });

      this.redisClient.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
      });

      this.redisClient.on('connect', () => {
        this.logger.log('✅ Conectado a Redis Cloud exitosamente');
      });

      await this.redisClient.connect();
    } catch (error) {
      this.logger.error('❌ Error conectando a Redis:', error);
      throw error;
    }
  }

  /**
   * Guarda una sesión de jugador en Redis
   * Key: player:{userId}
   * TTL: 30 minutos
   */
  async savePlayerSession(session: PlayerSession): Promise<void> {
    const key = `player:${session.userId}`;
    await this.redisClient.set(key, JSON.stringify(session), {
      EX: 1800, // 30 minutos
    });
    this.logger.log(`Sesión guardada: ${session.nombre} ${session.apellido}`);
  }

  /**
   * Obtiene la sesión de un jugador
   */
  async getPlayerSession(userId: string): Promise<PlayerSession | null> {
    const key = `player:${userId}`;
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Elimina la sesión de un jugador
   */
  async deletePlayerSession(userId: string): Promise<void> {
    const key = `player:${userId}`;
    await this.redisClient.del(key);
  }

  /**
   * Guarda el estado de una lobby/partida
   * Key: lobby:{lobbyId}
   * TTL: 1 hora
   */
  async saveGameState(gameState: GameState): Promise<void> {
    const key = `lobby:${gameState.lobbyId}`;
    await this.redisClient.set(key, JSON.stringify(gameState), {
      EX: 3600, // 1 hora
    });
    this.logger.log(`Estado de lobby guardado: ${gameState.lobbyId}`);
  }

  /**
   * Obtiene el estado de una lobby
   */
  async getGameState(lobbyId: string): Promise<GameState | null> {
    const key = `lobby:${lobbyId}`;
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Elimina una lobby (cuando termina la partida)
   */
  async deleteGameState(lobbyId: string): Promise<void> {
    const key = `lobby:${lobbyId}`;
    await this.redisClient.del(key);
    this.logger.log(`Lobby eliminada: ${lobbyId}`);
  }

  /**
   * Agrega un jugador a la cola de búsqueda
   * Key: queue:searching (Set)
   */
  async addToSearchQueue(userId: string): Promise<void> {
    await this.redisClient.sAdd('queue:searching', userId);
    this.logger.log(`Usuario agregado a cola: ${userId}`);
  }

  /**
   * Remueve un jugador de la cola de búsqueda
   */
  async removeFromSearchQueue(userId: string): Promise<void> {
    await this.redisClient.sRem('queue:searching', userId);
  }

  /**
   * Obtiene todos los usuarios buscando partida
   */
  async getSearchQueue(): Promise<string[]> {
    return await this.redisClient.sMembers('queue:searching');
  }

  /**
   * Obtiene todas las preguntas del juego
   */
  getQuestions(): VersusQuestion[] {
    return this.QUESTIONS;
  }

  /**
   * Obtiene una pregunta específica por ID
   */
  getQuestionById(questionId: string): VersusQuestion | undefined {
    return this.QUESTIONS.find((q) => q.id === questionId);
  }

  /**
   * Calcula los puntos obtenidos por una respuesta
   * Fórmula: 50 * (tiempo / 10)
   * Máximo: 50 puntos (respuesta inmediata)
   * Mínimo: 0 puntos (respuesta incorrecta)
   */
  calculatePoints(isCorrect: boolean, timeSeconds: number): number {
    if (!isCorrect) return 0;
    
    // Puntos base por respuesta correcta
    const basePoints = 50;
    
    // Bonus por velocidad (máximo en 0 segundos, mínimo en 10+ segundos)
    const timeBonus = Math.max(0, 10 - timeSeconds) * 5;
    
    return basePoints + timeBonus;
  }

  /**
   * Valida si una pregunta puede ser seleccionada
   * Verifica que no haya sido seleccionada ya por ningún jugador
   */
  canSelectQuestion(
    gameState: GameState,
    questionId: string,
  ): { valid: boolean; reason?: string } {
    // Verificar que la pregunta existe
    const question = this.getQuestionById(questionId);
    if (!question) {
      return { valid: false, reason: 'La pregunta no existe' };
    }

    // Verificar que no haya sido seleccionada por player1
    if (gameState.player1.selectedQuestions.includes(questionId)) {
      return { valid: false, reason: 'Esta pregunta ya fue seleccionada' };
    }

    // Verificar que no haya sido seleccionada por player2
    if (gameState.player2.selectedQuestions.includes(questionId)) {
      return { valid: false, reason: 'Esta pregunta ya fue seleccionada' };
    }

    return { valid: true };
  }

  /**
   * Verifica si ambos jugadores terminaron de seleccionar
   */
  haveBothFinishedSelection(gameState: GameState): boolean {
    return (
      gameState.player1.hasFinishedSelection &&
      gameState.player2.hasFinishedSelection
    );
  }

  /**
   * Asigna las preguntas seleccionadas a cada jugador
   * Player1 responde las que seleccionó Player2 y viceversa
   */
  assignQuestionsToPlayers(gameState: GameState): GameState {
    // Player1 responde las preguntas seleccionadas por Player2
    gameState.player1.assignedQuestions = [
      ...gameState.player2.selectedQuestions,
    ];

    // Player2 responde las preguntas seleccionadas por Player1
    gameState.player2.assignedQuestions = [
      ...gameState.player1.selectedQuestions,
    ];

    return gameState;
  }

  /**
   * Cambia el turno al otro jugador
   */
  switchTurn(gameState: GameState): GameState {
    gameState.currentTurn =
      gameState.currentTurn === gameState.player1.userId
        ? gameState.player2.userId
        : gameState.player1.userId;

    gameState.turnStartedAt = new Date();

    return gameState;
  }

  /**
   * Cierra la conexión con Redis (llamar en onModuleDestroy)
   */
  async onModuleDestroy() {
    await this.redisClient.quit();
    this.logger.log('Conexión Redis cerrada');
  }
}