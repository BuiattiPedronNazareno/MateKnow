// ====================================
// ARCHIVO: src/versus/versus.service.ts
// ====================================

import { Injectable, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { 
  GameState,  
  GamePhase, 
  PlayerGameState,
  VersusQuestion 
} from './interfaces/game-state.interface';
import { PlayerSession } from './interfaces/player-session.interface';

// Constantes
const TIPO_ABIERTA_ID = 'ae5e4e4c-39b2-4354-9aae-b7d87a156cdc'; // ID del tipo "abierta" a EXCLUIR
const MIN_PREGUNTAS_VERSUS = 10;
const MAX_PREGUNTAS_PARTIDA = 16;

@Injectable()
export class VersusService {
  private readonly logger = new Logger(VersusService.name);
  private redisClient: RedisClientType;
  private supabase: any;

  constructor(private configService: ConfigService) {
    this.initRedis();
    this.initSupabase();
  }

  private initSupabase() {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.supabase = createSupabaseClient(supabaseUrl, supabaseKey);
    this.logger.log('✅ Supabase inicializado en VersusService');
  }


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
        this.logger.log('✅ Conectado a Redis Cloud');
      });

      await this.redisClient.connect();
    } catch (error) {
      this.logger.error('❌ Error conectando a Redis:', error);
      throw error;
    }
  }

  // ========================================
  // NUEVA LÓGICA: Preguntas desde Supabase
  // ========================================

  /**
 * Valida si una clase tiene suficientes preguntas para Versus
 * Condiciones: cualquier tipo EXCEPTO "abierta", is_versus = true, >= 10 preguntas
 */
  async validarPreguntasDisponibles(claseId: string): Promise<{ valido: boolean; cantidad: number }> {
    const { data, error } = await this.supabase
      .from('actividad_ejercicio')
      .select(`
        ejercicio:ejercicio_id (
          id,
          tipo_id,
          metadata
        ),
        actividad:actividad_id (
          clase_id
        )
      `)
      .eq('actividad.clase_id', claseId);

    if (error) {
      this.logger.error(`Error validando preguntas: ${error.message}`);
      return { valido: false, cantidad: 0 };
    }

    // Filtrar: cualquier tipo EXCEPTO "abierta" y con is_versus = true
    const preguntasValidas = (data || []).filter((item: any) => {
      const ej = item.ejercicio;
      if (!ej) return false;
      
      const noEsAbierta = ej.tipo_id !== TIPO_ABIERTA_ID;
      const esVersus = ej.metadata?.is_versus === true;
      
      return noEsAbierta && esVersus;
    });

    const cantidad = preguntasValidas.length;
    this.logger.log(`📊 Validación clase ${claseId}: ${cantidad} preguntas válidas (excluyendo abiertas)`);
    
    return { 
      valido: cantidad >= MIN_PREGUNTAS_VERSUS, 
      cantidad 
    };
  }

 /**
 * Obtiene preguntas de una clase filtradas para Versus
 * Todos los tipos EXCEPTO "abierta" con is_versus = true
 */
  async obtenerPreguntasDeClase(claseId: string): Promise<VersusQuestion[]> {
    try {
      // Query directa a ejercicios, filtrando por clase a través de actividades
      const { data: actividadesData, error: actividadesError } = await this.supabase
        .from('actividad')
        .select('id')
        .eq('clase_id', claseId);

      if (actividadesError) {
        this.logger.error(`Error obteniendo actividades: ${actividadesError.message}`);
        return [];
      }

      const actividadIds = actividadesData?.map((a: any) => a.id) || [];
      
      if (actividadIds.length === 0) {
        this.logger.warn(`No hay actividades para clase ${claseId}`);
        return [];
      }

      // Obtener ejercicios únicos de estas actividades
      const { data: relacionesData, error: relacionesError } = await this.supabase
        .from('actividad_ejercicio')
        .select('ejercicio_id')
        .in('actividad_id', actividadIds);

      if (relacionesError) {
        this.logger.error(`Error obteniendo relaciones: ${relacionesError.message}`);
        return [];
      }

      // Extraer IDs únicos de ejercicios
      const ejercicioIds = [...new Set(relacionesData?.map((r: any) => r.ejercicio_id) || [])];

      if (ejercicioIds.length === 0) {
        this.logger.warn(`No hay ejercicios vinculados a clase ${claseId}`);
        return [];
      }

      // Consulta directa a ejercicios con sus opciones
      // 🔥 CAMBIO: Excluir tipo "abierta" en lugar de filtrar por multiple-choice
      const { data: ejerciciosData, error: ejerciciosError } = await this.supabase
        .from('ejercicio')
        .select(`
          id,
          enunciado,
          puntos,
          tipo_id,
          metadata,
          opcion_ejercicio (
            id,
            texto,
            is_correcta
          )
        `)
        .in('id', ejercicioIds)
        .neq('tipo_id', TIPO_ABIERTA_ID); // Excluir preguntas abiertas

      if (ejerciciosError) {
        this.logger.error(`Error obteniendo ejercicios: ${ejerciciosError.message}`);
        return [];
      }

      // Filtrar y mapear preguntas válidas
      const preguntasValidas: VersusQuestion[] = [];

      for (const ej of (ejerciciosData || [])) {
        // Filtrar: solo con is_versus = true
        const esVersus = ej.metadata?.is_versus === true;
        if (!esVersus) continue;

        // Validar que tenga opciones (para tipos que las requieren)
        const opciones = ej.opcion_ejercicio || [];
        if (opciones.length === 0) {
          this.logger.warn(`Ejercicio ${ej.id} sin opciones, omitiendo`);
          continue;
        }

        // Encontrar índice de respuesta correcta
        const indexCorrecta = opciones.findIndex((o: any) => o.is_correcta === true);
        if (indexCorrecta === -1) {
          this.logger.warn(`Ejercicio ${ej.id} sin respuesta correcta marcada`);
          continue;
        }

        preguntasValidas.push({
          id: ej.id,
          enunciado: ej.enunciado,
          opciones: opciones.map((o: any) => o.texto),
          respuestaCorrecta: indexCorrecta,
          categoria: ej.metadata?.categoria || 'General',
        });
      }

      this.logger.log(`📚 Clase ${claseId}: ${preguntasValidas.length} preguntas válidas para Versus (todos los tipos excepto abiertas)`);
      return preguntasValidas;
    } catch (error) {
      this.logger.error(`Error en obtenerPreguntasDeClase: ${error.message}`);
      return [];
    }
  }

  /**
   * Selecciona preguntas aleatorias para una partida
   * Máximo 16, o todas si hay menos
   */
  seleccionarPreguntasAleatorias(preguntas: VersusQuestion[]): VersusQuestion[] {
    if (preguntas.length <= MAX_PREGUNTAS_PARTIDA) {
      return this.shuffleArray([...preguntas]);
    }

    // Seleccionar 16 aleatorias
    const shuffled = this.shuffleArray([...preguntas]);
    return shuffled.slice(0, MAX_PREGUNTAS_PARTIDA);
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // ========================================
  // COLA DE BÚSQUEDA POR CLASE
  // ========================================

  async addToSearchQueue(userId: string, claseId: string): Promise<void> {
    const key = `queue:searching:${claseId}`;
    await this.redisClient.sAdd(key, userId);
    this.logger.log(`Usuario ${userId} agregado a cola de clase ${claseId}`);
  }

  async removeFromSearchQueue(userId: string, claseId: string): Promise<void> {
    const key = `queue:searching:${claseId}`;
    await this.redisClient.sRem(key, userId);
  }

  async getSearchQueue(claseId: string): Promise<string[]> {
    const key = `queue:searching:${claseId}`;
    return await this.redisClient.sMembers(key);
  }

  // ========================================
  // SESIONES Y LOBBIES (sin cambios mayores)
  // ========================================

  async savePlayerSession(session: PlayerSession): Promise<void> {
    const key = `player:${session.userId}`;
    await this.redisClient.set(key, JSON.stringify(session), { EX: 1800 });
  }

  async getPlayerSession(userId: string): Promise<PlayerSession | null> {
    const key = `player:${userId}`;
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deletePlayerSession(userId: string): Promise<void> {
    const key = `player:${userId}`;
    await this.redisClient.del(key);
  }

  async saveGameState(gameState: GameState): Promise<void> {
    const key = `lobby:${gameState.lobbyId}`;
    await this.redisClient.set(key, JSON.stringify(gameState), { EX: 3600 });
  }

  async getGameState(lobbyId: string): Promise<GameState | null> {
    const key = `lobby:${lobbyId}`;
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteGameState(lobbyId: string): Promise<void> {
    const key = `lobby:${lobbyId}`;
    await this.redisClient.del(key);
  }

  // ========================================
  // LÓGICA DE JUEGO
  // ========================================

  /**
   * Valida si una pregunta puede ser seleccionada
   * MODIFICADO: Verifica contra ambos jugadores
   */
  canSelectQuestion(
    gameState: GameState,
    questionId: string,
  ): { valid: boolean; reason?: string } {
    // Verificar que la pregunta existe en el pool de la partida
    const question = gameState.questions?.find(q => q.id === questionId);
    if (!question) {
      return { valid: false, reason: 'La pregunta no existe en esta partida' };
    }

    // Verificar que NO haya sido seleccionada por NINGUNO de los jugadores
    if (gameState.player1.selectedQuestions.includes(questionId)) {
      return { valid: false, reason: 'Esta pregunta ya fue seleccionada' };
    }

    if (gameState.player2.selectedQuestions.includes(questionId)) {
      return { valid: false, reason: 'Esta pregunta ya fue seleccionada' };
    }

    return { valid: true };
  }

  // Mantener métodos existentes sin cambios
  getQuestionById(questionId: string): VersusQuestion | undefined {
    // Este método ya no se usa directamente, las preguntas están en gameState
    return undefined;
  }

  getQuestions(): VersusQuestion[] {
    // Deprecado - las preguntas se obtienen de la BD
    return [];
  }

  calculatePoints(isCorrect: boolean, timeSeconds: number): number {
    if (!isCorrect) return 0;
    const basePoints = 50;
    const timeBonus = Math.max(0, 10 - timeSeconds) * 5;
    return basePoints + timeBonus;
  }

  haveBothFinishedSelection(gameState: GameState): boolean {
    return (
      gameState.player1.hasFinishedSelection &&
      gameState.player2.hasFinishedSelection
    );
  }

  assignQuestionsToPlayers(gameState: GameState): GameState {
    gameState.player1.assignedQuestions = [...gameState.player2.selectedQuestions];
    gameState.player2.assignedQuestions = [...gameState.player1.selectedQuestions];
    return gameState;
  }

  switchTurn(gameState: GameState): GameState {
    gameState.currentTurn =
      gameState.currentTurn === gameState.player1.userId
        ? gameState.player2.userId
        : gameState.player1.userId;
    gameState.turnStartedAt = new Date();
    return gameState;
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
    this.logger.log('Conexión Redis cerrada');
  }
}