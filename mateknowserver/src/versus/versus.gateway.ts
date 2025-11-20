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
import { Logger, UseGuards } from '@nestjs/common';
import { VersusService } from './versus.service';
import { PlayerSession } from './interfaces/player-session.interface';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

/**
 * Gateway de WebSockets para el Modo Versus
 * Maneja conexiones en tiempo real entre jugadores
 */
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
    this.logger.log('🎮 VersusGateway inicializado');
    this.logger.log(`📡 Namespace: versus`);
    this.logger.log(`🌐 CORS habilitado para: http://localhost:3000`);

    // Cliente de Supabase para validar tokens
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

  /**
   * Se ejecuta después de la inicialización del servidor
   */
  afterInit(server: Server) {
    this.logger.log('✅ WebSocket Server inicializado correctamente');
    this.logger.log(`🔌 Escuchando en: ws://localhost:4000/versus`);
  }

  /**
   * Se ejecuta cuando un cliente se conecta
   * Valida el token JWT y crea la sesión del jugador
   */
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      this.logger.log(`🔌 Intento de conexión desde: ${client.id}`);

      // Obtener token del query string: ?token=xxx
      const token = client.handshake.query.token as string;

      if (!token) {
        this.logger.error(`❌ Conexión rechazada: sin token`);
        client.emit('error', { message: 'Token no proporcionado' });
        client.disconnect();
        return;
      }

      this.logger.log(`🔑 Validando token...`);

      // Validar que supabase esté inicializado
      if (!this.supabase || !this.supabase.auth) {
        this.logger.error(`❌ Cliente de Supabase no inicializado correctamente`);
        client.emit('error', { message: 'Error de configuración del servidor' });
        client.disconnect();
        return;
      }

      // Validar token con Supabase
      let data, error;
      try {
        const result = await this.supabase.auth.getUser(token);
        data = result.data;
        error = result.error;
      } catch (authError) {
        this.logger.error(`❌ Error al validar token con Supabase: ${authError.message}`);
        client.emit('error', { message: 'Error al validar token. Verifica tu conexión a internet.' });
        client.disconnect();
        return;
      }

      if (error || !data.user) {
        this.logger.error(`❌ Token inválido: ${error?.message}`);
        client.emit('error', { message: 'Token inválido o expirado' });
        client.disconnect();
        return;
      }

      this.logger.log(`✅ Token válido para user: ${data.user.id}`);
      this.logger.log(`📧 Email: ${data.user.email}`);

      // Obtener datos del usuario desde la tabla usuarios
      const { data: userData, error: userError } = await this.supabase
        .from('usuarios')
        .select('id, nombre, apellido, email')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        this.logger.error(`❌ Usuario no encontrado en tabla usuarios: ${data.user.id}`);
        this.logger.error(`Error detalle: ${userError?.message}`);
        this.logger.warn(`💡 Sugerencia: Verifica que el usuario exista en la tabla usuarios`);
        client.emit('error', { 
          message: 'Usuario no encontrado en la base de datos',
          userId: data.user.id,
          email: data.user.email
        });
        client.disconnect();
        return;
      }

      // Crear sesión del jugador
      const playerSession: PlayerSession = {
        userId: userData.id,
        socketId: client.id,
        nombre: userData.nombre || 'Usuario',
        apellido: userData.apellido || 'Sin Apellido',
        email: userData.email,
        isSearching: false,
        connectedAt: new Date(),
      };

      // Guardar sesión en Redis
      await this.versusService.savePlayerSession(playerSession);

      // Guardar datos del usuario en el socket para acceso rápido
      client.data.user = playerSession;

      this.logger.log(
        `✅ Cliente conectado: ${userData.nombre} ${userData.apellido} (${client.id})`,
      );

      // Emitir evento de conexión exitosa al cliente
      client.emit('connected', {
        message: 'Conexión establecida exitosamente',
        user: {
          userId: userData.id,
          nombre: userData.nombre,
          apellido: userData.apellido,
        },
      });
    } catch (error) {
      this.logger.error(`Error en handleConnection: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Se ejecuta cuando un cliente se desconecta
   */
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    try {
      const user = client.data.user as PlayerSession;

      if (user) {
        // Eliminar de la cola de búsqueda si estaba buscando
        if (user.isSearching) {
          await this.versusService.removeFromSearchQueue(user.userId);
        }

        // Si estaba en una lobby, notificar al rival
        if (user.currentLobbyId) {
          const gameState = await this.versusService.getGameState(
            user.currentLobbyId,
          );

          if (gameState) {
            // Encontrar al rival
            const rivalId =
              gameState.player1.userId === user.userId
                ? gameState.player2.userId
                : gameState.player1.userId;

            const rivalSession = await this.versusService.getPlayerSession(rivalId);

            if (rivalSession) {
              // Notificar al rival que el oponente se desconectó
              this.server.to(rivalSession.socketId).emit('opponent-disconnected', {
                message: 'Tu oponente se ha desconectado',
                lobbyId: user.currentLobbyId,
              });
            }

            // Eliminar la lobby
            await this.versusService.deleteGameState(user.currentLobbyId);
          }
        }

        // Eliminar sesión de Redis
        await this.versusService.deletePlayerSession(user.userId);

        this.logger.log(
          `❌ Cliente desconectado: ${user.nombre} ${user.apellido} (${client.id})`,
        );
      }
    } catch (error) {
      this.logger.error(`Error en handleDisconnect: ${error.message}`);
    }
  }

  /**
   * Evento: Buscar partida
   * El cliente emite este evento cuando presiona "Buscar Duelo"
   */
  @SubscribeMessage('search-match')
  async handleSearchMatch(@ConnectedSocket() client: Socket) {
    try {
      const user = client.data.user as PlayerSession;

      if (!user) {
        client.emit('error', { message: 'Usuario no autenticado' });
        return;
      }

      this.logger.log(`🔍 ${user.nombre} está buscando partida...`);

      // Marcar como buscando
      user.isSearching = true;
      await this.versusService.savePlayerSession(user);

      // Agregar a la cola de búsqueda
      await this.versusService.addToSearchQueue(user.userId);

      // Notificar al cliente que está en la cola
      client.emit('searching', {
        message: 'Buscando oponente...',
        status: 'searching',
      });

      // Intentar hacer match con otro jugador
      await this.attemptMatchmaking(user);
    } catch (error) {
      this.logger.error(`Error en search-match: ${error.message}`);
      client.emit('error', { message: 'Error al buscar partida' });
    }
  }

  /**
   * Evento: Cancelar búsqueda
   */
  @SubscribeMessage('cancel-search')
  async handleCancelSearch(@ConnectedSocket() client: Socket) {
    try {
      const user = client.data.user as PlayerSession;

      if (!user) return;

      user.isSearching = false;
      await this.versusService.savePlayerSession(user);
      await this.versusService.removeFromSearchQueue(user.userId);

      client.emit('search-cancelled', {
        message: 'Búsqueda cancelada',
      });

      this.logger.log(`${user.nombre} canceló la búsqueda`);
    } catch (error) {
      this.logger.error(`Error en cancel-search: ${error.message}`);
    }
  }

  /**
   * Evento: Seleccionar pregunta
   * El jugador selecciona una pregunta para que su rival responda
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

      // Obtener estado de la partida
      const gameState = await this.versusService.getGameState(lobbyId);

      if (!gameState) {
        client.emit('error', { message: 'Lobby no encontrada' });
        return;
      }

      // Verificar que esté en fase de selección
      if (gameState.phase !== 'selection') {
        client.emit('error', {
          message: 'No estás en fase de selección',
        });
        return;
      }

      // Verificar que sea su turno
      if (gameState.currentTurn !== user.userId) {
        client.emit('error', {
          message: 'No es tu turno',
        });
        return;
      }

      // Identificar jugador
      const isPlayer1 = gameState.player1.userId === user.userId;
      const currentPlayer = isPlayer1 ? gameState.player1 : gameState.player2;
      const opponent = isPlayer1 ? gameState.player2 : gameState.player1;

      // Verificar que no haya seleccionado ya 5 preguntas
      if (currentPlayer.selectedQuestions.length >= 5) {
        client.emit('error', {
          message: 'Ya seleccionaste 5 preguntas',
        });
        return;
      }

      // Validar que la pregunta puede ser seleccionada
      const validation = this.versusService.canSelectQuestion(
        gameState,
        questionId,
      );

      if (!validation.valid) {
        client.emit('error', { message: validation.reason });
        return;
      }

      // ✅ Agregar pregunta a la lista de seleccionadas
      currentPlayer.selectedQuestions.push(questionId);

      // Verificar si completó las 5 selecciones
      if (currentPlayer.selectedQuestions.length === 5) {
        currentPlayer.hasFinishedSelection = true;
        this.logger.log(
          `${user.nombre} completó su selección de preguntas`,
        );
      }

      // Cambiar turno al otro jugador (SIEMPRE, a menos que ambos hayan terminado)
      const bothFinished = this.versusService.haveBothFinishedSelection(gameState);
      
      if (!bothFinished) {
        this.versusService.switchTurn(gameState);
      }

      // Guardar estado actualizado
      await this.versusService.saveGameState(gameState);

      // Obtener sesión del oponente
      const opponentSession = await this.versusService.getPlayerSession(
        opponent.userId,
      );

      // ✅ Notificar a ambos jugadores sobre la selección
      client.emit('question-selected', {
        questionId,
        selectionsCount: currentPlayer.selectedQuestions.length,
        hasFinished: currentPlayer.hasFinishedSelection,
        currentTurn: gameState.currentTurn,
        yourTurn: gameState.currentTurn === user.userId,
      });

      if (opponentSession) {
        this.server.to(opponentSession.socketId).emit('opponent-selected', {
          selectionsCount: currentPlayer.selectedQuestions.length,
          hasFinished: currentPlayer.hasFinishedSelection,
          currentTurn: gameState.currentTurn,
          yourTurn: gameState.currentTurn === opponent.userId,
        });
      }

      // Verificar si ambos terminaron de seleccionar
      if (this.versusService.haveBothFinishedSelection(gameState)) {
        await this.startAnsweringPhase(gameState);
      }
    } catch (error) {
      this.logger.error(`Error en select-question: ${error.message}`);
      client.emit('error', { message: 'Error al seleccionar pregunta' });
    }
  }

  /**
   * Evento: Responder pregunta
   * El jugador envía su respuesta a una pregunta asignada
   */
  @SubscribeMessage('answer-question')
  async handleAnswerQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      lobbyId: string;
      questionId: string;
      selectedOption: number;
      timeSeconds: number;
    },
  ) {
    try {
      const user = client.data.user as PlayerSession;

      if (!user) {
        client.emit('error', { message: 'Usuario no autenticado' });
        return;
      }

      const { lobbyId, questionId, selectedOption, timeSeconds } = data;

      // Obtener estado de la partida
      const gameState = await this.versusService.getGameState(lobbyId);

      if (!gameState) {
        client.emit('error', { message: 'Lobby no encontrada' });
        return;
      }

      // Verificar que esté en fase de respuesta
      if (gameState.phase !== 'answering') {
        client.emit('error', {
          message: 'No estás en fase de respuesta',
        });
        return;
      }

      // Identificar jugador
      const isPlayer1 = gameState.player1.userId === user.userId;
      const currentPlayer = isPlayer1 ? gameState.player1 : gameState.player2;
      const opponent = isPlayer1 ? gameState.player2 : gameState.player1;

      // Verificar que la pregunta esté asignada al jugador
      if (!currentPlayer.assignedQuestions.includes(questionId)) {
        client.emit('error', {
          message: 'Esta pregunta no te fue asignada',
        });
        return;
      }

      // Verificar que no haya respondido ya esta pregunta
      const alreadyAnswered = currentPlayer.answers.some(
        (ans) => ans.questionId === questionId,
      );

      if (alreadyAnswered) {
        client.emit('error', {
          message: 'Ya respondiste esta pregunta',
        });
        return;
      }

      // Obtener la pregunta original
      const question = this.versusService.getQuestionById(questionId);

      if (!question) {
        client.emit('error', { message: 'Pregunta no encontrada' });
        return;
      }

      // Verificar si la respuesta es correcta
      const isCorrect = question.respuestaCorrecta === selectedOption;

      // Calcular puntos
      const points = this.versusService.calculatePoints(isCorrect, timeSeconds);

      // Crear objeto de respuesta
      const answer = {
        questionId,
        selectedOption,
        isCorrect,
        timeSeconds,
        points,
        answeredAt: new Date(),
      };

      // Agregar respuesta al jugador
      currentPlayer.answers.push(answer);
      currentPlayer.totalPoints += points;

      if (isCorrect) {
        currentPlayer.correctAnswers++;
      }

      // Verificar si completó todas las respuestas
      if (currentPlayer.answers.length === 5) {
        currentPlayer.hasFinishedAnswering = true;
        this.logger.log(
          `${user.nombre} completó todas sus respuestas - Puntos: ${currentPlayer.totalPoints}`,
        );
      }

      // Guardar estado actualizado
      await this.versusService.saveGameState(gameState);

      // Notificar al jugador sobre su respuesta
      client.emit('answer-recorded', {
        questionId,
        isCorrect,
        points,
        totalPoints: currentPlayer.totalPoints,
        answersCount: currentPlayer.answers.length,
        hasFinished: currentPlayer.hasFinishedAnswering,
      });

      // Obtener sesión del oponente para notificar progreso
      const opponentSession = await this.versusService.getPlayerSession(
        opponent.userId,
      );

      if (opponentSession) {
        this.server.to(opponentSession.socketId).emit('opponent-progress', {
          answersCount: currentPlayer.answers.length,
          hasFinished: currentPlayer.hasFinishedAnswering,
        });
      }

      // Verificar si ambos terminaron de responder
      if (
        gameState.player1.hasFinishedAnswering &&
        gameState.player2.hasFinishedAnswering
      ) {
        await this.finishMatch(gameState);
      }
    } catch (error) {
      this.logger.error(`Error en answer-question: ${error.message}`);
      client.emit('error', { message: 'Error al registrar respuesta' });
    }
  }

  /**
   * Inicia la fase de respuestas
   * Se ejecuta automáticamente cuando ambos jugadores terminan de seleccionar
   */
  private async startAnsweringPhase(gameState: any) {
    try {
      this.logger.log(`🎯 Iniciando fase de respuestas - Lobby: ${gameState.lobbyId}`);

      // Asignar preguntas a cada jugador
      this.versusService.assignQuestionsToPlayers(gameState);

      // Cambiar fase
      gameState.phase = 'answering';
      gameState.answeringStartedAt = new Date();
      gameState.currentTurn = null; // Ya no hay turnos en esta fase

      // Guardar estado
      await this.versusService.saveGameState(gameState);

      // Obtener sesiones de ambos jugadores
      const player1Session = await this.versusService.getPlayerSession(
        gameState.player1.userId,
      );
      const player2Session = await this.versusService.getPlayerSession(
        gameState.player2.userId,
      );

      // Obtener las preguntas completas asignadas a cada jugador
      const player1Questions = gameState.player1.assignedQuestions.map((qId) =>
        this.versusService.getQuestionById(qId),
      );
      const player2Questions = gameState.player2.assignedQuestions.map((qId) =>
        this.versusService.getQuestionById(qId),
      );

      // Notificar a Player 1
      if (player1Session) {
        this.server.to(player1Session.socketId).emit('answering-phase-start', {
          phase: 'answering',
          timeLimit: 90,
          questions: player1Questions,
          message: 'Responde las preguntas seleccionadas por tu rival',
        });
      }

      // Notificar a Player 2
      if (player2Session) {
        this.server.to(player2Session.socketId).emit('answering-phase-start', {
          phase: 'answering',
          timeLimit: 90,
          questions: player2Questions,
          message: 'Responde las preguntas seleccionadas por tu rival',
        });
      }

      // Programar timeout de 90 segundos
      setTimeout(async () => {
        await this.checkAnsweringTimeout(gameState.lobbyId);
      }, 90000); // 90 segundos
    } catch (error) {
      this.logger.error(`Error en startAnsweringPhase: ${error.message}`);
    }
  }

  /**
   * Verifica si se acabó el tiempo de respuesta
   */
  private async checkAnsweringTimeout(lobbyId: string) {
    try {
      const gameState = await this.versusService.getGameState(lobbyId);

      if (!gameState || gameState.phase !== 'answering') {
        return; // Ya terminó la partida
      }

      this.logger.log(`⏰ Tiempo agotado - Lobby: ${lobbyId}`);

      // Finalizar partida con respuestas incompletas
      await this.finishMatch(gameState);
    } catch (error) {
      this.logger.error(`Error en checkAnsweringTimeout: ${error.message}`);
    }
  }

  /**
   * Finaliza la partida y calcula el ganador
   */
  private async finishMatch(gameState: any) {
    try {
      this.logger.log(`🏁 Finalizando partida - Lobby: ${gameState.lobbyId}`);

      // Cambiar fase a finalizada
      gameState.phase = 'finished';
      gameState.finishedAt = new Date();

      // Determinar ganador
      const player1Points = gameState.player1.totalPoints;
      const player2Points = gameState.player2.totalPoints;

      let winnerId: string | null = null;
      let isDraw = false;

      if (player1Points > player2Points) {
        winnerId = gameState.player1.userId;
      } else if (player2Points > player1Points) {
        winnerId = gameState.player2.userId;
      } else {
        isDraw = true;
      }

      gameState.winnerId = winnerId;
      gameState.isDraw = isDraw;

      // Guardar estado final
      await this.versusService.saveGameState(gameState);

      // Preparar datos de resultado
      const resultData = {
        lobbyId: gameState.lobbyId,
        phase: 'finished',
        winner: winnerId
          ? {
              userId: winnerId,
              nombre:
                winnerId === gameState.player1.userId
                  ? gameState.player1.nombre
                  : gameState.player2.nombre,
              apellido:
                winnerId === gameState.player1.userId
                  ? gameState.player1.apellido
                  : gameState.player2.apellido,
              points:
                winnerId === gameState.player1.userId
                  ? player1Points
                  : player2Points,
            }
          : null,
        isDraw,
        player1: {
          userId: gameState.player1.userId,
          nombre: gameState.player1.nombre,
          apellido: gameState.player1.apellido,
          totalPoints: player1Points,
          correctAnswers: gameState.player1.correctAnswers,
          answers: gameState.player1.answers,
        },
        player2: {
          userId: gameState.player2.userId,
          nombre: gameState.player2.nombre,
          apellido: gameState.player2.apellido,
          totalPoints: player2Points,
          correctAnswers: gameState.player2.correctAnswers,
          answers: gameState.player2.answers,
        },
      };

      // Obtener sesiones de ambos jugadores
      const player1Session = await this.versusService.getPlayerSession(
        gameState.player1.userId,
      );
      const player2Session = await this.versusService.getPlayerSession(
        gameState.player2.userId,
      );

      // Notificar a ambos jugadores
      if (player1Session) {
        this.server.to(player1Session.socketId).emit('match-finished', {
          ...resultData,
          youWon: winnerId === gameState.player1.userId,
        });

        // Limpiar sesión
        player1Session.currentLobbyId = undefined;
        await this.versusService.savePlayerSession(player1Session);
      }

      if (player2Session) {
        this.server.to(player2Session.socketId).emit('match-finished', {
          ...resultData,
          youWon: winnerId === gameState.player2.userId,
        });

        // Limpiar sesión
        player2Session.currentLobbyId = undefined;
        await this.versusService.savePlayerSession(player2Session);
      }

      this.logger.log(
        `🏆 Partida finalizada - Ganador: ${
          isDraw
            ? 'EMPATE'
            : winnerId === gameState.player1.userId
              ? gameState.player1.nombre
              : gameState.player2.nombre
        }`,
      );

      // TODO: Guardar en base de datos (PARTE 6)
      // Aquí se guardará en versus_historial y actualizará versus_ranking

      // Eliminar lobby después de 30 segundos
      setTimeout(async () => {
        await this.versusService.deleteGameState(gameState.lobbyId);
        this.logger.log(`🗑️ Lobby eliminada: ${gameState.lobbyId}`);
      }, 30000);
    } catch (error) {
      this.logger.error(`Error en finishMatch: ${error.message}`);
    }
  }

  /**
   * Lógica de matchmaking: intenta emparejar jugadores
   */
  private async attemptMatchmaking(player: PlayerSession) {
    try {
      // Obtener todos los jugadores en cola
      const queue = await this.versusService.getSearchQueue();

      // Filtrar: debe haber al menos 2 jugadores y el jugador actual debe estar en la cola
      if (queue.length < 2 || !queue.includes(player.userId)) {
        return; // No hay suficientes jugadores
      }

      // Obtener el primer jugador en cola que no sea el actual
      const opponentId = queue.find((id) => id !== player.userId);

      if (!opponentId) return;

      // Obtener sesión del oponente
      const opponent = await this.versusService.getPlayerSession(opponentId);

      if (!opponent || !opponent.isSearching) return;

      // ¡MATCH ENCONTRADO! Crear lobby
      await this.createLobby(player, opponent);
    } catch (error) {
      this.logger.error(`Error en attemptMatchmaking: ${error.message}`);
    }
  }

  /**
   * Crea una lobby cuando dos jugadores hacen match
   */
  private async createLobby(player1: PlayerSession, player2: PlayerSession) {
    try {
      // Generar ID único para la lobby
      const lobbyId = `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Determinar quién empieza aleatoriamente
      const firstTurn = Math.random() < 0.5 ? player1.userId : player2.userId;

      // Crear estado inicial del juego
      const gameState = {
        lobbyId,
        phase: 'selection' as any,
        player1: this.createInitialPlayerState(player1),
        player2: this.createInitialPlayerState(player2),
        currentTurn: firstTurn,
        turnStartedAt: new Date(),
        selectionTimeLimit: 20,
        answeringTimeLimit: 90,
        createdAt: new Date(),
      };

      // Guardar estado en Redis
      await this.versusService.saveGameState(gameState);

      // Actualizar sesiones de jugadores
      player1.isSearching = false;
      player1.currentLobbyId = lobbyId;
      player2.isSearching = false;
      player2.currentLobbyId = lobbyId;

      await this.versusService.savePlayerSession(player1);
      await this.versusService.savePlayerSession(player2);

      // Remover de la cola
      await this.versusService.removeFromSearchQueue(player1.userId);
      await this.versusService.removeFromSearchQueue(player2.userId);

      // Notificar a ambos jugadores que se encontró un match
      const matchData = {
        lobbyId,
        opponent: {
          nombre: player2.nombre,
          apellido: player2.apellido,
        },
        currentTurn: firstTurn,
        yourTurn: firstTurn === player1.userId,
        phase: 'selection',
        questions: this.versusService.getQuestions(),
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

      this.logger.log(
        `🎮 Lobby creada: ${player1.nombre} vs ${player2.nombre} (${lobbyId})`,
      );
    } catch (error) {
      this.logger.error(`Error en createLobby: ${error.message}`);
    }
  }

  /**
   * Crea el estado inicial de un jugador
   */
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
}