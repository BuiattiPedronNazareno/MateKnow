'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import versusService from '../../services/versusService';
import Timer from '../components/Timer';

export default function VersusGamePage() {
  const params = useParams();
  const router = useRouter();
  const lobbyId = params.matchId as string;

  // Estados de la partida
  const [phase, setPhase] = useState<'selection' | 'answering' | 'finished'>('selection');
  const [questions, setQuestions] = useState<any[]>([]);
  const [assignedQuestions, setAssignedQuestions] = useState<any[]>([]);
  const [opponent, setOpponent] = useState<any>(null);
  const [currentTurn, setCurrentTurn] = useState<string>('');
  const [yourTurn, setYourTurn] = useState(false);
  const [turnStartedAt, setTurnStartedAt] = useState<Date>(new Date());
  const [mySelections, setMySelections] = useState<string[]>([]);
  const [opponentSelectionsCount, setOpponentSelectionsCount] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [answeringStartedAt, setAnsweringStartedAt] = useState<Date>(new Date());
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  /**
   * EFECTO PRINCIPAL: Conectar socket y registrar listeners
   */
  useEffect(() => {
    // Obtener userId del usuario actual
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUserId(JSON.parse(userData).id);
    }

    // Conectar al WebSocket
    const socket = versusService.getSocket() || versusService.connect();

    // Cargar datos guardados del match (si existen)
    const savedMatchData = versusService.getCurrentMatchData();
    if (savedMatchData && savedMatchData.lobbyId === lobbyId) {
      console.log('✅ Cargando datos guardados del match');
      setQuestions(savedMatchData.questions);
      setOpponent(savedMatchData.opponent);
      setCurrentTurn(savedMatchData.currentTurn);
      setYourTurn(savedMatchData.yourTurn);
      setTurnStartedAt(new Date());
      setPhase('selection');
    }

    /**
     * LISTENER: Match encontrado
     */
    socket.on('match-found', (data) => {
      if (data.lobbyId === lobbyId) {
        console.log('🎯 Match encontrado:', data);
        setQuestions(data.questions);
        setOpponent(data.opponent);
        setCurrentTurn(data.currentTurn);
        setYourTurn(data.yourTurn);
        setTurnStartedAt(new Date());
      }
    });

    /**
     * LISTENER: Pregunta seleccionada por ti
     */
    socket.on('question-selected', (data) => {
      console.log('✅ Pregunta seleccionada:', data);
      setMySelections((prev) => [...prev, data.questionId]);
      setCurrentTurn(data.currentTurn);
      setYourTurn(data.yourTurn);
      setTurnStartedAt(new Date());
    });

    /**
     * LISTENER: Pregunta seleccionada por rival
     */
    socket.on('opponent-selected', (data) => {
      console.log('👤 Rival seleccionó:', data);
      setOpponentSelectionsCount(data.selectionsCount);
      setCurrentTurn(data.currentTurn);
      setYourTurn(data.yourTurn);
      setTurnStartedAt(new Date());
    });

    /**
     * LISTENER: Inicio de fase de respuestas
     * ⚠️ NOTA: Este listener estaba duplicado, ahora es uno solo
     */
    socket.on('answering-phase-start', (data) => {
      console.log('⚡ FASE DE RESPUESTAS INICIADA:', data);
      setPhase('answering');
      setAssignedQuestions(data.questions);
      setAnsweringStartedAt(new Date());
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
    });

    /**
     * LISTENER: Respuesta registrada
     */
    socket.on('answer-recorded', (data) => {
      console.log('📝 Respuesta registrada:', data);
      setAnsweredQuestions((prev) => [...prev, data.questionId]);
      setTotalPoints(data.totalPoints);
    });

    /**
     * LISTENER: Progreso del rival
     */
    socket.on('opponent-progress', (data) => {
      console.log('📊 Progreso rival:', data);
      setOpponentProgress(data.answersCount);
    });

    /**
     * LISTENER: Partida finalizada
     */
    socket.on('match-finished', (data) => {
      console.log('🏁 PARTIDA FINALIZADA:', data);
      setPhase('finished');
      setMatchResult(data);
    });

    /**
     * CLEANUP: Remover listeners al desmontar
     */
    return () => {
      socket.off('match-found');
      socket.off('question-selected');
      socket.off('opponent-selected');
      socket.off('answering-phase-start');
      socket.off('answer-recorded');
      socket.off('opponent-progress');
      socket.off('match-finished');

      // Limpiar datos si la partida terminó
      if (phase === 'finished') {
        versusService.clearCurrentMatchData();
      }
    };
  }, [lobbyId]);

  /**
   * EFECTO: Resetear selección de opción al cambiar pregunta
   */
  useEffect(() => {
    if (phase === 'answering') {
      setSelectedOption(null);
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestionIndex, phase]);

  /**
   * Handler: Seleccionar pregunta
   */
  const handleSelectQuestion = (questionId: string) => {
    if (!yourTurn || mySelections.length >= 5 || mySelections.includes(questionId)) {
      return; // No es tu turno o ya seleccionaste esta pregunta
    }
    versusService.selectQuestion(lobbyId, questionId);
  };

  /**
   * Handler: Enviar respuesta
   */
  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;

    const timeSeconds = Math.floor((Date.now() - questionStartTime) / 1000);
    versusService.answerQuestion(
      lobbyId,
      assignedQuestions[currentQuestionIndex].id,
      selectedOption,
      timeSeconds
    );

    // Pasar a siguiente pregunta si hay más
    if (currentQuestionIndex < assignedQuestions.length - 1) {
      setTimeout(() => setCurrentQuestionIndex(currentQuestionIndex + 1), 500);
    }
  };

  /**
   * RENDER: Loading
   */
  if (!opponent || questions.length === 0) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Cargando partida...</Typography>
        </Paper>
      </Box>
    );
  }

  /**
   * RENDER: Main Game Container
   */
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="lg">
        {/* Header - Información de la partida */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              Lobby: {lobbyId.slice(0, 20)}...
            </Typography>
            <Chip
              label={phase === 'selection' ? '🎯 Selección' : phase === 'answering' ? '⚡ Respuestas' : '🏁 Finalizado'}
              color="primary"
              size="medium"
            />
            <Typography variant="body1" fontWeight="600">
              vs {opponent.nombre} {opponent.apellido}
            </Typography>
          </Box>
        </Paper>

        {/* FASE 1: SELECCIÓN DE PREGUNTAS */}
        {phase === 'selection' && (
          <>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Selecciona 5 preguntas
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Para que <strong>{opponent.nombre}</strong> responda
                  </Typography>
                </Box>
                <Chip
                  label={`${mySelections.length}/5`}
                  color={mySelections.length === 5 ? 'success' : 'primary'}
                  size="medium"
                  sx={{ fontSize: '1.2rem', px: 2, py: 3 }}
                />
              </Box>

              {/* Timer de selección */}
              <Timer initialTime={20} startTime={turnStartedAt} key={turnStartedAt.getTime()} />

              {/* Información de turno */}
              <Alert
                severity={yourTurn ? 'success' : 'info'}
                sx={{ mt: 2 }}
                icon={yourTurn ? <CheckCircleIcon /> : <AccessTimeIcon />}
              >
                {yourTurn
                  ? '✅ Es tu turno - Selecciona una pregunta'
                  : `⏳ Esperando a ${opponent.nombre}... (${opponentSelectionsCount}/5)`}
              </Alert>
            </Paper>

            {/* Grid de preguntas */}
            <Grid container spacing={2}>
              {questions.map((q) => {
                const isSelected = mySelections.includes(q.id);
                const canSelect = yourTurn && !isSelected && mySelections.length < 5;

                return (
                  <Grid item xs={12} sm={6} md={3} key={q.id}>
                    <Card
                      onClick={() => canSelect && handleSelectQuestion(q.id)}
                      sx={{
                        cursor: canSelect ? 'pointer' : 'not-allowed',
                        opacity: isSelected ? 0.6 : 1,
                        bgcolor: isSelected ? 'primary.light' : 'white',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: canSelect ? 6 : 1,
                          transform: canSelect ? 'translateY(-4px)' : 'none',
                        },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Chip label={q.categoria} size="small" color="secondary" />
                          {isSelected && <Chip label="✓" size="small" color="primary" />}
                        </Box>
                        <Typography variant="body2" sx={{ minHeight: 60 }}>
                          {q.enunciado}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          {q.id.toUpperCase()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}

        {/* FASE 2: RESPONDIENDO PREGUNTAS */}
        {phase === 'answering' && assignedQuestions[currentQuestionIndex] && (
          <>
            {/* Información de puntos y progreso */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6">Puntos:</Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      {totalPoints}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      Tú: {answeredQuestions.length}/5
                    </Typography>
                    <Typography variant="body2">
                      {opponent.nombre}: {opponentProgress}/5
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              <Box sx={{ mt: 2 }}>
                <Timer initialTime={90} startTime={answeringStartedAt} />
              </Box>
            </Paper>

            {/* Botones de navegación entre preguntas */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
              {assignedQuestions.map((_, i) => {
                const isAnswered = answeredQuestions.includes(assignedQuestions[i].id);
                return (
                  <Button
                    key={i}
                    variant={i === currentQuestionIndex ? 'contained' : isAnswered ? 'outlined' : 'text'}
                    color={isAnswered ? 'success' : 'primary'}
                    onClick={() => setCurrentQuestionIndex(i)}
                    sx={{ minWidth: 48, height: 48, borderRadius: 2 }}
                  >
                    {i + 1}
                  </Button>
                );
              })}
            </Box>

            {/* Pregunta actual */}
            <Paper sx={{ p: 4 }}>
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={assignedQuestions[currentQuestionIndex].categoria}
                  color="secondary"
                  sx={{ mb: 2 }}
                />
                <Typography variant="h5" fontWeight="bold">
                  {assignedQuestions[currentQuestionIndex].enunciado}
                </Typography>
              </Box>

              {/* Opciones de respuesta */}
              <Grid container spacing={2}>
                {assignedQuestions[currentQuestionIndex].opciones.map((opcion: string, i: number) => (
                  <Grid item xs={12} key={i}>
                    <Button
                      fullWidth
                      variant={selectedOption === i ? 'contained' : 'outlined'}
                      onClick={() => setSelectedOption(i)}
                      sx={{
                        py: 2,
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                      }}
                      disabled={answeredQuestions.includes(assignedQuestions[currentQuestionIndex].id)}
                    >
                      <Typography fontWeight="bold" sx={{ mr: 2, minWidth: 30 }}>
                        {String.fromCharCode(65 + i)}.
                      </Typography>
                      {opcion}
                    </Button>
                  </Grid>
                ))}
              </Grid>

              {/* Botón de confirmación */}
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmitAnswer}
                  disabled={
                    selectedOption === null ||
                    answeredQuestions.includes(assignedQuestions[currentQuestionIndex].id)
                  }
                  sx={{ px: 6 }}
                >
                  Confirmar respuesta
                </Button>
              </Box>
            </Paper>
          </>
        )}

        {/* FASE 3: RESULTADOS FINALES */}
        <Dialog open={phase === 'finished' && !!matchResult} maxWidth="md" fullWidth>
          <DialogTitle
            sx={{
              textAlign: 'center',
              bgcolor: matchResult?.youWon
                ? 'success.main'
                : matchResult?.isDraw
                  ? 'warning.main'
                  : 'error.main',
              color: 'white',
              py: 3,
            }}
          >
            <Typography variant="h3" component="div">
              {matchResult?.isDraw ? '🤝' : matchResult?.youWon ? '🏆' : '😔'}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ mt: 2 }}>
              {matchResult?.isDraw ? '¡Empate!' : matchResult?.youWon ? '¡Victoria!' : 'Derrota'}
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 4 }}>
            <Grid container spacing={3}>
              {/* Resultado del jugador actual */}
              <Grid item xs={6}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    bgcolor: matchResult?.youWon ? 'success.light' : 'grey.200',
                    color: matchResult?.youWon ? 'white' : 'text.primary',
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Tú
                  </Typography>
                  <Typography variant="h2" fontWeight="bold">
                    {matchResult?.player1?.userId === currentUserId
                      ? matchResult?.player1?.totalPoints
                      : matchResult?.player2?.totalPoints}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    ✅{' '}
                    {matchResult?.player1?.userId === currentUserId
                      ? matchResult?.player1?.correctAnswers
                      : matchResult?.player2?.correctAnswers}
                    /5 correctas
                  </Typography>
                </Paper>
              </Grid>

              {/* Resultado del rival */}
              <Grid item xs={6}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    bgcolor:
                      !matchResult?.youWon && !matchResult?.isDraw ? 'success.light' : 'grey.200',
                    color:
                      !matchResult?.youWon && !matchResult?.isDraw ? 'white' : 'text.primary',
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    {opponent?.nombre}
                  </Typography>
                  <Typography variant="h2" fontWeight="bold">
                    {matchResult?.player1?.userId !== currentUserId
                      ? matchResult?.player1?.totalPoints
                      : matchResult?.player2?.totalPoints}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    ✅{' '}
                    {matchResult?.player1?.userId !== currentUserId
                      ? matchResult?.player1?.correctAnswers
                      : matchResult?.player2?.correctAnswers}
                    /5 correctas
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'center', gap: 2 }}>
            <Button
              onClick={() => router.push('/versus')}
              variant="contained"
              size="large"
              sx={{ px: 4 }}
            >
              🔄 Jugar de nuevo
            </Button>
            <Button
              onClick={() => router.push('/')}
              variant="outlined"
              size="large"
              sx={{ px: 4 }}
            >
              🏠 Volver al inicio
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}