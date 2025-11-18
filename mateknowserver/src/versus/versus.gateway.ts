// ====================================
// ARCHIVO: src/versus/versus.gateway.ts
// ====================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
    origin: 'http://localhost:3000', // Frontend Next.js
    credentials: true,
  },
  namespace: '/versus', // ws://localhost:4000/versus
})
export class VersusGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VersusGateway.name);
  private supabase;

  constructor(
    private readonly versusService: VersusService,
    private readonly configService: ConfigService,
  ) {
// ARREGLO #1: Validar que las variables de entorno existan
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY no definidas');
    }

    // Cliente de Supabase para validar tokens
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
}

  /**
   * Se ejecuta cuando un cliente se conecta
   * Valida el token JWT y crea la sesión del jugador
   */
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      // Obtener token del query string: ?token=xxx
      const token = client.handshake.query.token as string;

      if (!token) {
        this.logger.warn(`Conexión rechazada: sin token`);
        client.disconnect();
        return;
      }

      // Validar token con Supabase
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data.user) {
        this.logger.warn(`Token inválido: ${error?.message}`);
        client.disconnect();
        return;
      }

      // Obtener datos del usuario desde la tabla usuarios
      const { data: userData, error: userError } = await this.supabase
        .from('usuarios')
        .select('id, nombre, apellido, email')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        this.logger.warn(`Usuario no encontrado en BD: ${data.user.id}`);
        client.disconnect();
        return;
      }

      // Crear sesión del jugador
      const playerSession: PlayerSession = {
        userId: userData.id,
        socketId: client.id,
        nombre: userData.nombre,
        apellido: userData.apellido,
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