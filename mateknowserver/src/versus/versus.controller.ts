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
   * POST /versus/select-question
   * Selecciona una pregunta (alternativa REST al evento WebSocket)
   */
  @Post('select-question')
  @HttpCode(HttpStatus.OK)
  async selectQuestion(
    @Request() req,
    @Body() body: { lobbyId: string; questionId: string },
  ) {
    const userId = req.user.id;
    const { lobbyId, questionId } = body;

    // Obtener estado de la partida
    const gameState = await this.versusService.getGameState(lobbyId);

    if (!gameState) {
      return {
        success: false,
        message: 'Lobby no encontrada',
      };
    }

    // Verificar fase
    if (gameState.phase !== 'selection') {
      return {
        success: false,
        message: 'No estás en fase de selección',
      };
    }

    // Verificar turno
    if (gameState.currentTurn !== userId) {
      return {
        success: false,
        message: 'No es tu turno',
      };
    }

    // Identificar jugador
    const isPlayer1 = gameState.player1.userId === userId;
    const currentPlayer = isPlayer1 ? gameState.player1 : gameState.player2;

    // Verificar límite
    if (currentPlayer.selectedQuestions.length >= 5) {
      return {
        success: false,
        message: 'Ya seleccionaste 5 preguntas',
      };
    }

    // Validar pregunta
    const validation = this.versusService.canSelectQuestion(
      gameState,
      questionId,
    );

    if (!validation.valid) {
      return {
        success: false,
        message: validation.reason,
      };
    }

    // Agregar pregunta
    currentPlayer.selectedQuestions.push(questionId);

    if (currentPlayer.selectedQuestions.length === 5) {
      currentPlayer.hasFinishedSelection = true;
    }

    // Cambiar turno
    if (!currentPlayer.hasFinishedSelection) {
      this.versusService.switchTurn(gameState);
    }

    // Guardar
    await this.versusService.saveGameState(gameState);

    return {
      success: true,
      data: {
        selectionsCount: currentPlayer.selectedQuestions.length,
        hasFinished: currentPlayer.hasFinishedSelection,
        currentTurn: gameState.currentTurn,
      },
    };
  }

  /**
   * POST /versus/answer
   * Responde una pregunta (alternativa REST al evento WebSocket)
   */
  @Post('answer')
  @HttpCode(HttpStatus.OK)
  async answerQuestion(
    @Request() req,
    @Body()
    body: {
      lobbyId: string;
      questionId: string;
      selectedOption: number;
      timeSeconds: number;
    },
  ) {
    const userId = req.user.id;
    const { lobbyId, questionId, selectedOption, timeSeconds } = body;

    // Obtener estado
    const gameState = await this.versusService.getGameState(lobbyId);

    if (!gameState) {
      return {
        success: false,
        message: 'Lobby no encontrada',
      };
    }

    // Verificar fase
    if (gameState.phase !== 'answering') {
      return {
        success: false,
        message: 'No estás en fase de respuesta',
      };
    }

    // Identificar jugador
    const isPlayer1 = gameState.player1.userId === userId;
    const currentPlayer = isPlayer1 ? gameState.player1 : gameState.player2;

    // Verificar que la pregunta esté asignada
    if (!currentPlayer.assignedQuestions.includes(questionId)) {
      return {
        success: false,
        message: 'Esta pregunta no te fue asignada',
      };
    }

    // Verificar que no haya respondido ya
    const alreadyAnswered = currentPlayer.answers.some(
      (ans) => ans.questionId === questionId,
    );

    if (alreadyAnswered) {
      return {
        success: false,
        message: 'Ya respondiste esta pregunta',
      };
    }

    // Obtener pregunta
    const question = this.versusService.getQuestionById(questionId);

    if (!question) {
      return {
        success: false,
        message: 'Pregunta no encontrada',
      };
    }

    // Verificar respuesta
    const isCorrect = question.respuestaCorrecta === selectedOption;

    // Calcular puntos
    const points = this.versusService.calculatePoints(isCorrect, timeSeconds);

    // Crear respuesta
    const answer = {
      questionId,
      selectedOption,
      isCorrect,
      timeSeconds,
      points,
      answeredAt: new Date(),
    };

    // Agregar respuesta
    currentPlayer.answers.push(answer);
    currentPlayer.totalPoints += points;

    if (isCorrect) {
      currentPlayer.correctAnswers++;
    }

    // Verificar si terminó
    if (currentPlayer.answers.length === 5) {
      currentPlayer.hasFinishedAnswering = true;
    }

    // Guardar
    await this.versusService.saveGameState(gameState);

    return {
      success: true,
      data: {
        isCorrect,
        points,
        totalPoints: currentPlayer.totalPoints,
        answersCount: currentPlayer.answers.length,
        hasFinished: currentPlayer.hasFinishedAnswering,
      },
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