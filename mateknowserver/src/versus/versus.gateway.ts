import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { VersusService } from './versus.service';
import { PlayerSession } from './interfaces/player-session.interface';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  namespace: 'versus',
  transports: ['websocket', 'polling'],
})
export class VersusGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VersusGateway.name);
  private supabase;

  constructor(
    private readonly versusService: VersusService,
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('❌ SUPABASE_URL o SUPABASE_ANON_KEY no configurados en .env');
      throw new Error('Configuración de Supabase faltante');
    }

    this.logger.log(`🔧 Configurando Supabase: ${supabaseUrl.substring(0, 30)}...`);

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.logger.log('✅ Cliente de Supabase inicializado');
    } catch (error) {
      this.logger.error(`❌ Error inicializando Supabase: ${error.message}`);
      throw error;
    }
  }

  afterInit(server: Server) {
    this.logger.log('✅ WebSocket Server inicializado en /versus');
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      if (!token) {
        client.emit('error', { message: 'Token no proporcionado' });
        client.disconnect();
        return;
      }

      const { data, error } = await this.supabase.auth.getUser(token);
      if (error || !data.user) {
        client.emit('error', { message: 'Token inválido o expirado' });
        client.disconnect();
        return;
      }

      const { data: userData, error: userError } = await this.supabase
        .from('usuarios')
        .select('id, nombre, apellido, email')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        client.emit('error', { message: 'Usuario no encontrado' });
        client.disconnect();
        return;
      }

      const playerSession: PlayerSession = {
        userId: userData.id,
        socketId: client.id,
        nombre: userData.nombre || 'Usuario',
        apellido: userData.apellido || '',
        email: userData.email,
        isSearching: false,
        connectedAt: new Date(),
      };

      await this.versusService.savePlayerSession(playerSession);
      client.data.user = playerSession;

      this.logger.log(`✅ Conectado: ${userData.nombre} ${userData.apellido}`);
      client.emit('connected', {
        message: 'Conexión establecida',
        user: { userId: userData.id, nombre: userData.nombre, apellido: userData.apellido },
      });
    } catch (error) {
      this.logger.error(`Error en conexión: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    try {
      const user = client.data.user as PlayerSession;
      if (!user) return;

      // Remover de cola si estaba buscando
      if (user.isSearching && user.currentClaseId) {
        await this.versusService.removeFromSearchQueue(user.userId, user.currentClaseId);
      }

      // Notificar al rival si estaba en partida
      if (user.currentLobbyId) {
        const gameState = await this.versusService.getGameState(user.currentLobbyId);
        if (gameState) {
          const rivalId = gameState.player1.userId === user.userId
            ? gameState.player2.userId
            : gameState.player1.userId;
          const rivalSession = await this.versusService.getPlayerSession(rivalId);
          if (rivalSession) {
            this.server.to(rivalSession.socketId).emit('opponent-disconnected', {
              message: 'Tu oponente se ha desconectado',
              lobbyId: user.currentLobbyId,
            });
          }
          await this.versusService.deleteGameState(user.currentLobbyId);
        }
      }

      await this.versusService.deletePlayerSession(user.userId);
      this.logger.log(`❌ Desconectado: ${user.nombre}`);
    } catch (error) {
      this.logger.error(`Error en desconexión: ${error.message}`);
    }
  }

  /**
   * BUSCAR PARTIDA - Requiere claseId
   */
  @SubscribeMessage('search-match')
  async handleSearchMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { claseId: string },
  ) {
    try {
      const user = client.data.user as PlayerSession;
      if (!user) {
        client.emit('error', { message: 'Usuario no autenticado' });
        return;
      }

      const { claseId } = data;
      if (!claseId) {
        client.emit('error', { message: 'claseId es requerido' });
        return;
      }

      this.logger.log(`🔍 ${user.nombre} busca partida en clase ${claseId}`);

      // Validar preguntas disponibles
      const validation = await this.versusService.validarPreguntasDisponibles(claseId);
      if (!validation.valido) {
        client.emit('error', {
          message: `No hay suficientes preguntas. Se necesitan mínimo 10 (con is_versus=true y tipo multiple-choice). Disponibles: ${validation.cantidad}`,
        });
        return;
      }

      // Marcar como buscando
      user.isSearching = true;
      user.currentClaseId = claseId;
      await this.versusService.savePlayerSession(user);

      // Agregar a cola de esa clase
      await this.versusService.addToSearchQueue(user.userId, claseId);

      client.emit('searching', {
        message: 'Buscando oponente en tu clase...',
        status: 'searching',
        claseId,
      });

      // Intentar matchmaking
      await this.attemptMatchmaking(user, claseId);
    } catch (error) {
      this.logger.error(`Error en search-match: ${error.message}`);
      client.emit('error', { message: 'Error al buscar partida' });
    }
  }

  @SubscribeMessage('cancel-search')
  async handleCancelSearch(@ConnectedSocket() client: Socket) {
    try {
      const user = client.data.user as PlayerSession;
      if (!user) return;

      const claseId = user.currentClaseId;
      user.isSearching = false;
      user.currentClaseId = undefined;
      await this.versusService.savePlayerSession(user);

      if (claseId) {
        await this.versusService.removeFromSearchQueue(user.userId, claseId);
      }

      client.emit('search-cancelled', { message: 'Búsqueda cancelada' });
      this.logger.log(`${user.nombre} canceló búsqueda`);
    } catch (error) {
      this.logger.error(`Error en cancel-search: ${error.message}`);
    }
  }

  /**
   * SELECCIONAR PREGUNTA - Notifica a AMBOS jugadores
   */
  @SubscribeMessage('select-question')
  async handleSelectQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lobbyId: string; questionId: string },
  ) {
    try {
      const user = client.data.user as PlayerSession;
      if (!user) {
        client.emit('error', { message: 'Usuario no autenticado' });
        return;
      }

      const { lobbyId, questionId } = data;
      const gameState = await this.versusService.getGameState(lobbyId);

      if (!gameState) {
        client.emit('error', { message: 'Lobby no encontrada' });
        return;
      }

      if (gameState.phase !== 'selection') {
        client.emit('error', { message: 'No estás en fase de selección' });
        return;
      }

      if (gameState.currentTurn !== user.userId) {
        client.emit('error', { message: 'No es tu turno' });
        return;
      }

      const isPlayer1 = gameState.player1.userId === user.userId;
      const currentPlayer = isPlayer1 ? gameState.player1 : gameState.player2;
      const opponent = isPlayer1 ? gameState.player2 : gameState.player1;

      if (currentPlayer.selectedQuestions.length >= 5) {
        client.emit('error', { message: 'Ya seleccionaste 5 preguntas' });
        return;
      }

      // Validar que la pregunta no fue seleccionada por NADIE
      const validation = this.versusService.canSelectQuestion(gameState, questionId);
      if (!validation.valid) {
        client.emit('error', { message: validation.reason });
        return;
      }

      // Agregar pregunta
      currentPlayer.selectedQuestions.push(questionId);

      if (currentPlayer.selectedQuestions.length === 5) {
        currentPlayer.hasFinishedSelection = true;
        this.logger.log(`${user.nombre} completó selección`);
      }

      const bothFinished = this.versusService.haveBothFinishedSelection(gameState);
      if (!bothFinished) {
        this.versusService.switchTurn(gameState);
      }

      await this.versusService.saveGameState(gameState);

      const opponentSession = await this.versusService.getPlayerSession(opponent.userId);

      // Notificar al jugador actual
      client.emit('question-selected', {
        questionId,
        selectionsCount: currentPlayer.selectedQuestions.length,
        hasFinished: currentPlayer.hasFinishedSelection,
        currentTurn: gameState.currentTurn,
        yourTurn: gameState.currentTurn === user.userId,
      });

      // CRÍTICO: Notificar al oponente CON el questionId para que lo deshabilite
      if (opponentSession) {
        this.server.to(opponentSession.socketId).emit('opponent-selected', {
          questionId, // El oponente sabe qué pregunta ya no está disponible
          selectionsCount: currentPlayer.selectedQuestions.length,
          hasFinished: currentPlayer.hasFinishedSelection,
          currentTurn: gameState.currentTurn,
          yourTurn: gameState.currentTurn === opponent.userId,
        });
      }

      // Verificar si ambos terminaron → iniciar fase de respuestas
      if (this.versusService.haveBothFinishedSelection(gameState)) {
        await this.startAnsweringPhase(gameState);
      } else {
        // Reiniciar timer para el nuevo turno
        this.startSelectionTimer(lobbyId);
      }
    } catch (error) {
      this.logger.error(`Error en select-question: ${error.message}`);
      client.emit('error', { message: 'Error al seleccionar pregunta' });
    }
  }

  @SubscribeMessage('answer-question')
  async handleAnswerQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lobbyId: string; questionId: string; selectedOption: number; timeSeconds: number },
  ) {
    try {
      const user = client.data.user as PlayerSession;
      if (!user) {
        client.emit('error', { message: 'Usuario no autenticado' });
        return;
      }

      const { lobbyId, questionId, selectedOption, timeSeconds } = data;
      const gameState = await this.versusService.getGameState(lobbyId);

      if (!gameState || gameState.phase !== 'answering') {
        client.emit('error', { message: 'No estás en fase de respuesta' });
        return;
      }

      const isPlayer1 = gameState.player1.userId === user.userId;
      const currentPlayer = isPlayer1 ? gameState.player1 : gameState.player2;
      const opponent = isPlayer1 ? gameState.player2 : gameState.player1;

      if (!currentPlayer.assignedQuestions.includes(questionId)) {
        client.emit('error', { message: 'Esta pregunta no te fue asignada' });
        return;
      }

      if (currentPlayer.answers.some(ans => ans.questionId === questionId)) {
        client.emit('error', { message: 'Ya respondiste esta pregunta' });
        return;
      }

      // Obtener pregunta del gameState
      const question = gameState.questions?.find(q => q.id === questionId);
      if (!question) {
        client.emit('error', { message: 'Pregunta no encontrada' });
        return;
      }

      const isCorrect = question.respuestaCorrecta === selectedOption;
      const points = this.versusService.calculatePoints(isCorrect, timeSeconds);

      currentPlayer.answers.push({
        questionId,
        selectedOption,
        isCorrect,
        timeSeconds,
        points,
        answeredAt: new Date(),
      });
      currentPlayer.totalPoints += points;
      if (isCorrect) currentPlayer.correctAnswers++;

      if (currentPlayer.answers.length === 5) {
        currentPlayer.hasFinishedAnswering = true;
        this.logger.log(`${user.nombre} terminó respuestas - Puntos: ${currentPlayer.totalPoints}`);
      }

      await this.versusService.saveGameState(gameState);

      client.emit('answer-recorded', {
        questionId,
        isCorrect,
        points,
        totalPoints: currentPlayer.totalPoints,
        answersCount: currentPlayer.answers.length,
        hasFinished: currentPlayer.hasFinishedAnswering,
      });

      const opponentSession = await this.versusService.getPlayerSession(opponent.userId);
      if (opponentSession) {
        this.server.to(opponentSession.socketId).emit('opponent-progress', {
          answersCount: currentPlayer.answers.length,
          hasFinished: currentPlayer.hasFinishedAnswering,
        });
      }

      if (gameState.player1.hasFinishedAnswering && gameState.player2.hasFinishedAnswering) {
        await this.finishMatch(gameState);
      }
    } catch (error) {
      this.logger.error(`Error en answer-question: ${error.message}`);
      client.emit('error', { message: 'Error al registrar respuesta' });
    }
  }

  // ========================================
  // MÉTODOS PRIVADOS
  // ========================================

  private async attemptMatchmaking(player: PlayerSession, claseId: string) {
    const queue = await this.versusService.getSearchQueue(claseId);
    if (queue.length < 2 || !queue.includes(player.userId)) return;

    const opponentId = queue.find(id => id !== player.userId);
    if (!opponentId) return;

    const opponent = await this.versusService.getPlayerSession(opponentId);
    if (!opponent || !opponent.isSearching || opponent.currentClaseId !== claseId) return;

    await this.createLobby(player, opponent, claseId);
  }

  private async createLobby(player1: PlayerSession, player2: PlayerSession, claseId: string) {
    const lobbyId = `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Obtener preguntas de la BD (frescas cada partida)
    const todasPreguntas = await this.versusService.obtenerPreguntasDeClase(claseId);
    const preguntasPartida = this.versusService.seleccionarPreguntasAleatorias(todasPreguntas);

    this.logger.log(`🎮 Lobby ${lobbyId}: ${preguntasPartida.length} preguntas (clase ${claseId})`);

    const firstTurn = Math.random() < 0.5 ? player1.userId : player2.userId;

    const gameState = {
      lobbyId,
      claseId,
      phase: 'selection' as const,
      questions: preguntasPartida,
      player1: this.createInitialPlayerState(player1),
      player2: this.createInitialPlayerState(player2),
      currentTurn: firstTurn,
      turnStartedAt: new Date(),
      selectionTimeLimit: 20,
      answeringTimeLimit: 90,
      createdAt: new Date(),
    };

    await this.versusService.saveGameState(gameState);

    // Actualizar sesiones
    player1.isSearching = false;
    player1.currentLobbyId = lobbyId;
    player2.isSearching = false;
    player2.currentLobbyId = lobbyId;
    await this.versusService.savePlayerSession(player1);
    await this.versusService.savePlayerSession(player2);

    // Remover de cola
    await this.versusService.removeFromSearchQueue(player1.userId, claseId);
    await this.versusService.removeFromSearchQueue(player2.userId, claseId);

    const matchData = {
      lobbyId,
      claseId,
      currentTurn: firstTurn,
      phase: 'selection',
      questions: preguntasPartida,
    };

    this.server.to(player1.socketId).emit('match-found', {
      ...matchData,
      opponent: { nombre: player2.nombre, apellido: player2.apellido },
      yourTurn: firstTurn === player1.userId,
    });

    this.server.to(player2.socketId).emit('match-found', {
      ...matchData,
      opponent: { nombre: player1.nombre, apellido: player1.apellido },
      yourTurn: firstTurn === player2.userId,
    });

    this.logger.log(`🎮 Match: ${player1.nombre} vs ${player2.nombre}`);

    // Iniciar timer de selección
    this.startSelectionTimer(lobbyId);
  }

  /**
   * Timer de 20 segundos para auto-selección
   */
  private startSelectionTimer(lobbyId: string) {
    setTimeout(async () => {
      await this.checkSelectionTimeout(lobbyId);
    }, 20000);
  }

  /**
   * Verifica si el jugador en turno no seleccionó y elige una aleatoria
   */
  private async checkSelectionTimeout(lobbyId: string) {
    try {
      const gameState = await this.versusService.getGameState(lobbyId);
      
      if (!gameState || gameState.phase !== 'selection') {
        return; // Partida terminó o cambió de fase
      }

      const currentUserId = gameState.currentTurn;
      if (!currentUserId) return;

      const isPlayer1Turn = gameState.player1.userId === currentUserId;
      const currentPlayer = isPlayer1Turn ? gameState.player1 : gameState.player2;
      const opponent = isPlayer1Turn ? gameState.player2 : gameState.player1;

      // Verificar si ya terminó de seleccionar
      if (currentPlayer.hasFinishedSelection) {
        return;
      }

      // Verificar si pasaron los 20 segundos desde el último turno
      const turnStart = new Date(gameState.turnStartedAt || gameState.createdAt).getTime();
      const now = Date.now();
      const elapsed = now - turnStart;

      if (elapsed < 19000) {
        // Aún no pasaron 20 segundos, reprogramar
        setTimeout(() => this.checkSelectionTimeout(lobbyId), 20000 - elapsed + 1000);
        return;
      }

      this.logger.log(`⏰ Timeout de selección para ${currentPlayer.nombre} en lobby ${lobbyId}`);

      // Seleccionar pregunta aleatoria disponible
      const selectedIds = new Set([
        ...gameState.player1.selectedQuestions,
        ...gameState.player2.selectedQuestions,
      ]);
      
      const availableQuestions = gameState.questions.filter(q => !selectedIds.has(q.id));
      
      if (availableQuestions.length === 0) {
        this.logger.warn('No hay preguntas disponibles para auto-selección');
        return;
      }

      const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
      
      // Agregar la pregunta
      currentPlayer.selectedQuestions.push(randomQuestion.id);
      
      if (currentPlayer.selectedQuestions.length === 5) {
        currentPlayer.hasFinishedSelection = true;
        this.logger.log(`${currentPlayer.nombre} completó selección (auto)`);
      }

      // Cambiar turno si no terminaron ambos
      const bothFinished = this.versusService.haveBothFinishedSelection(gameState);
      if (!bothFinished) {
        this.versusService.switchTurn(gameState);
      }

      await this.versusService.saveGameState(gameState);

      // Notificar a ambos jugadores
      const currentSession = await this.versusService.getPlayerSession(currentUserId);
      const opponentSession = await this.versusService.getPlayerSession(opponent.userId);

      if (currentSession) {
        this.server.to(currentSession.socketId).emit('question-selected', {
          questionId: randomQuestion.id,
          selectionsCount: currentPlayer.selectedQuestions.length,
          hasFinished: currentPlayer.hasFinishedSelection,
          currentTurn: gameState.currentTurn,
          yourTurn: gameState.currentTurn === currentUserId,
          autoSelected: true, // Indicador de auto-selección
        });
      }

      if (opponentSession) {
        this.server.to(opponentSession.socketId).emit('opponent-selected', {
          questionId: randomQuestion.id,
          selectionsCount: currentPlayer.selectedQuestions.length,
          hasFinished: currentPlayer.hasFinishedSelection,
          currentTurn: gameState.currentTurn,
          yourTurn: gameState.currentTurn === opponent.userId,
          autoSelected: true,
        });
      }

      // Verificar si ambos terminaron
      if (this.versusService.haveBothFinishedSelection(gameState)) {
        await this.startAnsweringPhase(gameState);
      } else {
        // Continuar timer para el siguiente turno
        this.startSelectionTimer(lobbyId);
      }

    } catch (error) {
      this.logger.error(`Error en checkSelectionTimeout: ${error.message}`);
    }
  }

  private createInitialPlayerState(session: PlayerSession): any {
    return {
      userId: session.userId,
      nombre: session.nombre,
      apellido: session.apellido,
      socketId: session.socketId,
      selectedQuestions: [],
      hasFinishedSelection: false,
      assignedQuestions: [],
      answers: [],
      hasFinishedAnswering: false,
      totalPoints: 0,
      correctAnswers: 0,
    };
  }

  private async startAnsweringPhase(gameState: any) {
    this.logger.log(`🎯 Iniciando respuestas - Lobby: ${gameState.lobbyId}`);

    this.versusService.assignQuestionsToPlayers(gameState);
    gameState.phase = 'answering';
    gameState.answeringStartedAt = new Date();
    gameState.currentTurn = null;

    await this.versusService.saveGameState(gameState);

    const p1Session = await this.versusService.getPlayerSession(gameState.player1.userId);
    const p2Session = await this.versusService.getPlayerSession(gameState.player2.userId);

    const p1Questions = gameState.player1.assignedQuestions.map(
      (qId: string) => gameState.questions?.find((q: any) => q.id === qId)
    ).filter(Boolean);

    const p2Questions = gameState.player2.assignedQuestions.map(
      (qId: string) => gameState.questions?.find((q: any) => q.id === qId)
    ).filter(Boolean);

    if (p1Session) {
      this.server.to(p1Session.socketId).emit('answering-phase-start', {
        phase: 'answering',
        timeLimit: 90,
        questions: p1Questions,
        message: 'Responde las preguntas de tu rival',
      });
    }

    if (p2Session) {
      this.server.to(p2Session.socketId).emit('answering-phase-start', {
        phase: 'answering',
        timeLimit: 90,
        questions: p2Questions,
        message: 'Responde las preguntas de tu rival',
      });
    }

    setTimeout(() => this.checkAnsweringTimeout(gameState.lobbyId), 90000);
  }

  private async checkAnsweringTimeout(lobbyId: string) {
    const gameState = await this.versusService.getGameState(lobbyId);
    if (!gameState || gameState.phase !== 'answering') return;
    this.logger.log(`⏰ Tiempo agotado - Lobby: ${lobbyId}`);
    await this.finishMatch(gameState);
  }

  private async finishMatch(gameState: any) {
    this.logger.log(`🏁 Finalizando - Lobby: ${gameState.lobbyId}`);

    gameState.phase = 'finished';
    gameState.finishedAt = new Date();

    const p1Points = gameState.player1.totalPoints;
    const p2Points = gameState.player2.totalPoints;

    let winnerId: string | null = null;
    let isDraw = false;

    if (p1Points > p2Points) winnerId = gameState.player1.userId;
    else if (p2Points > p1Points) winnerId = gameState.player2.userId;
    else isDraw = true;

    gameState.winnerId = winnerId;
    gameState.isDraw = isDraw;

    await this.versusService.saveGameState(gameState);

    const resultData = {
      lobbyId: gameState.lobbyId,
      phase: 'finished',
      winner: winnerId ? {
        userId: winnerId,
        nombre: winnerId === gameState.player1.userId ? gameState.player1.nombre : gameState.player2.nombre,
        apellido: winnerId === gameState.player1.userId ? gameState.player1.apellido : gameState.player2.apellido,
        points: winnerId === gameState.player1.userId ? p1Points : p2Points,
      } : null,
      isDraw,
      player1: {
        userId: gameState.player1.userId,
        nombre: gameState.player1.nombre,
        apellido: gameState.player1.apellido,
        totalPoints: p1Points,
        correctAnswers: gameState.player1.correctAnswers,
        answers: gameState.player1.answers,
      },
      player2: {
        userId: gameState.player2.userId,
        nombre: gameState.player2.nombre,
        apellido: gameState.player2.apellido,
        totalPoints: p2Points,
        correctAnswers: gameState.player2.correctAnswers,
        answers: gameState.player2.answers,
      },
    };

    const p1Session = await this.versusService.getPlayerSession(gameState.player1.userId);
    const p2Session = await this.versusService.getPlayerSession(gameState.player2.userId);

    if (p1Session) {
      this.server.to(p1Session.socketId).emit('match-finished', { ...resultData, youWon: winnerId === gameState.player1.userId });
      p1Session.currentLobbyId = undefined;
      p1Session.currentClaseId = undefined;
      await this.versusService.savePlayerSession(p1Session);
    }

    if (p2Session) {
      this.server.to(p2Session.socketId).emit('match-finished', { ...resultData, youWon: winnerId === gameState.player2.userId });
      p2Session.currentLobbyId = undefined;
      p2Session.currentClaseId = undefined;
      await this.versusService.savePlayerSession(p2Session);
    }

    this.logger.log(`🏆 Ganador: ${isDraw ? 'EMPATE' : (winnerId === gameState.player1.userId ? gameState.player1.nombre : gameState.player2.nombre)}`);

    setTimeout(async () => {
      await this.versusService.deleteGameState(gameState.lobbyId);
      this.logger.log(`🗑️ Lobby eliminada: ${gameState.lobbyId}`);
    }, 30000);
  }
}