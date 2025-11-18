// ====================================
// ARCHIVO: src/versus/versus.controller.ts
// ====================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VersusService } from './versus.service';
import { AuthGuard } from '../auth/guards/auth.guard'; // Ajusta la ruta según tu proyecto

/**
 * Controlador REST para el Modo Versus
 * Endpoints complementarios a WebSockets
 */
@Controller('versus')
@UseGuards(AuthGuard) // Todas las rutas requieren autenticación
export class VersusController {
  constructor(private readonly versusService: VersusService) {}

  /**
   * GET /versus/questions
   * Obtiene todas las preguntas disponibles
   */
  @Get('questions')
  @HttpCode(HttpStatus.OK)
  getQuestions() {
    return {
      success: true,
      data: this.versusService.getQuestions(),
      total: 16,
    };
  }

  /**
   * GET /versus/status
   * Verifica si el usuario está en una partida activa
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getStatus(@Request() req) {
    const userId = req.user.id;
    
    // Obtener sesión del jugador
    const session = await this.versusService.getPlayerSession(userId);

    if (!session) {
      return {
        success: true,
        inGame: false,
        message: 'No estás en ninguna partida',
      };
    }

    // Verificar si está en una lobby
    if (session.currentLobbyId) {
      const gameState = await this.versusService.getGameState(
        session.currentLobbyId,
      );

      if (gameState) {
        return {
          success: true,
          inGame: true,
          lobbyId: session.currentLobbyId,
          phase: gameState.phase,
          message: 'Estás en una partida activa',
        };
      }
    }

    return {
      success: true,
      inGame: false,
      isSearching: session.isSearching,
      message: session.isSearching ? 'Buscando partida...' : 'Disponible',
    };
  }

  /**
   * GET /versus/lobby/:lobbyId
   * Obtiene el estado completo de una lobby
   */
  @Get('lobby/:lobbyId')
  @HttpCode(HttpStatus.OK)
  async getLobbyState(@Param('lobbyId') lobbyId: string, @Request() req) {
    const userId = req.user.id;

    const gameState = await this.versusService.getGameState(lobbyId);

    if (!gameState) {
      return {
        success: false,
        message: 'Lobby no encontrada',
      };
    }

    // Verificar que el usuario sea parte de la lobby
    const isPlayer =
      gameState.player1.userId === userId ||
      gameState.player2.userId === userId;

    if (!isPlayer) {
      return {
        success: false,
        message: 'No eres parte de esta lobby',
      };
    }

    // Ocultar información sensible (preguntas seleccionadas por el rival)
    const sanitizedState = this.sanitizeGameState(gameState, userId);

    return {
      success: true,
      data: sanitizedState,
    };
  }

  /**
   * POST /versus/leave
   * Abandona una partida en curso (opcional, útil para casos edge)
   */
  @Post('leave')
  @HttpCode(HttpStatus.OK)
  async leaveMatch(@Request() req) {
    const userId = req.user.id;

    const session = await this.versusService.getPlayerSession(userId);

    if (!session || !session.currentLobbyId) {
      return {
        success: false,
        message: 'No estás en ninguna partida',
      };
    }

    // Eliminar lobby
    await this.versusService.deleteGameState(session.currentLobbyId);

    // Actualizar sesión
    session.currentLobbyId = undefined;
    session.isSearching = false;
    await this.versusService.savePlayerSession(session);

    return {
      success: true,
      message: 'Has abandonado la partida',
    };
  }

  /**
   * Sanitiza el estado del juego para no revelar información oculta
   * Por ejemplo: las preguntas seleccionadas por el rival
   */
  private sanitizeGameState(gameState: any, userId: string) {
    const isPlayer1 = gameState.player1.userId === userId;

    return {
      lobbyId: gameState.lobbyId,
      phase: gameState.phase,
      currentTurn: gameState.currentTurn,
      yourTurn: gameState.currentTurn === userId,
      player: isPlayer1 ? gameState.player1 : gameState.player2,
      opponent: isPlayer1 ? {
        userId: gameState.player2.userId,
        nombre: gameState.player2.nombre,
        apellido: gameState.player2.apellido,
        totalPoints: gameState.player2.totalPoints,
        hasFinishedSelection: gameState.player2.hasFinishedSelection,
        hasFinishedAnswering: gameState.player2.hasFinishedAnswering,
        // NO incluir selectedQuestions ni assignedQuestions del rival
      } : {
        userId: gameState.player1.userId,
        nombre: gameState.player1.nombre,
        apellido: gameState.player1.apellido,
        totalPoints: gameState.player1.totalPoints,
        hasFinishedSelection: gameState.player1.hasFinishedSelection,
        hasFinishedAnswering: gameState.player1.hasFinishedAnswering,
      },
      selectionTimeLimit: gameState.selectionTimeLimit,
      answeringTimeLimit: gameState.answeringTimeLimit,
      turnStartedAt: gameState.turnStartedAt,
      answeringStartedAt: gameState.answeringStartedAt,
    };
  }
}