'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  Box, Container, Paper, Typography, Button, Grid, Card, CardContent,
  Avatar, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, CircularProgress, Alert,
} from '@mui/material';
import {
  Timer, Person, CheckCircle, Cancel, EmojiEvents,
  ArrowBack, PlayArrow, Lock,
} from '@mui/icons-material';
import { versusService, VersusQuestion, MatchData, MatchResult } from '@/app/services/versusService';

// Componente Timer
const GameTimer = ({ seconds, urgent, label }: { seconds: number; urgent?: boolean; label?: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Timer sx={{ color: urgent ? '#D32F2F' : '#8B4513', fontSize: 20 }} />
    <Typography
      variant="h6"
      sx={{
        fontFamily: 'monospace',
        fontWeight: 700,
        color: urgent ? '#D32F2F' : 'white',
        animation: urgent ? 'pulse 0.5s infinite' : 'none',
        '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
      }}
    >
      {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
    </Typography>
    {label && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>{label}</Typography>}
  </Box>
);

export default function VersusMatchPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.matchId as string;
  const claseId = searchParams.get('claseId');

  // Estados principales
  const [phase, setPhase] = useState<'selection' | 'answering' | 'finished'>('selection');
  const [questions, setQuestions] = useState<VersusQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [mySelections, setMySelections] = useState<string[]>([]);
  const [assignedQuestions, setAssignedQuestions] = useState<VersusQuestion[]>([]);
  
  // Turno y tiempo
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [selectionTimer, setSelectionTimer] = useState(20);
  const [answeringTimer, setAnsweringTimer] = useState(90);
  const [turnKey, setTurnKey] = useState(0);

  // Respuestas
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [answerStartTime, setAnswerStartTime] = useState<number>(Date.now());
  const [myPoints, setMyPoints] = useState(0);
  const [myCorrect, setMyCorrect] = useState(0);
  const [hasFinishedAnswering, setHasFinishedAnswering] = useState(false);


  // Oponente
  const [opponent, setOpponent] = useState<{ nombre: string; apellido: string } | null>(null);
  const [opponentSelections, setOpponentSelections] = useState(0);
  const [opponentFinished, setOpponentFinished] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState(false);

  // UI
  const [error, setError] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Inicialización
  useEffect(() => {
    const socket = versusService.getSocket();
    const matchData = versusService.getCurrentMatchData();

    // Debug
    console.log('🎮 Match Page - Socket connected:', socket?.connected);
    console.log('🎮 Match Page - Match data:', matchData);

    if (!socket?.connected) {
      console.log('❌ No hay socket conectado, redirigiendo...');
      router.push(claseId ? `/versus?claseId=${claseId}` : '/dashboard');
      return;
    }

    if (!matchData) {
      console.log('❌ No hay datos de match, redirigiendo...');
      router.push(claseId ? `/versus?claseId=${claseId}` : '/dashboard');
      return;
    }

    setQuestions(matchData.questions || []);
    setOpponent(matchData.opponent);
    setIsMyTurn(matchData.yourTurn);
    setPhase(matchData.phase);
    setLoading(false);

    console.log('✅ Match inicializado correctamente');
    
    // Listeners

    versusService.onOpponentDisconnected((data) => {
      console.log('🚨 opponent-disconnected RECIBIDO:', data);
      setDisconnectMessage(true);
      
      // Limpiar y redirigir después de 3 segundos
      setTimeout(() => {
        versusService.clearMatchData();
        versusService.removeAllListeners();
        versusService.disconnect();
        router.push(claseId ? `/clases/${claseId}` : '/dashboard');
      }, 3000);
    });

    versusService.onQuestionSelected((data) => {
      console.log('question-selected:', data);
      setSelectedQuestions(prev => new Set([...prev, data.questionId]));
      setMySelections(prev => [...prev, data.questionId]);
      setIsMyTurn(data.yourTurn);
      setTurnKey(k => k + 1);
    });

    versusService.onOpponentSelected((data) => {
      console.log('opponent-selected:', data);
      setSelectedQuestions(prev => new Set([...prev, data.questionId]));
      setOpponentSelections(data.selectionsCount);
      setIsMyTurn(data.yourTurn);
      setTurnKey(k => k + 1);
    });

    versusService.onAnsweringPhaseStart((data) => {
      console.log('answering-phase-start:', data);
      setPhase('answering');
      setAssignedQuestions(data.questions || []);
      setAnswerStartTime(Date.now());
      setAnsweringTimer(data.timeLimit || 90);
    });

    versusService.onAnswerRecorded((data) => {
      console.log('answer-recorded:', data);
      setMyPoints(data.totalPoints);
      if (data.isCorrect) setMyCorrect(prev => prev + 1);
      
      // Marcar como finalizado cuando answersCount es 5
      if (data.answersCount >= 5) {
        setHasFinishedAnswering(true);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setAnswerStartTime(Date.now());
      }
    });

    versusService.onOpponentProgress((data) => {
      console.log('opponent-progress:', data);
      setOpponentFinished(data.hasFinished);
    });

    versusService.onMatchFinished((data) => {
      console.log('match-finished:', data);
      setPhase('finished');
      setMatchResult(data);
      setShowResult(true);
    });

        versusService.onError((data) => {
          console.log('error:', data);
          setError(data.message);
        });

        return () => {
          versusService.removeAllListeners();
        };
      }, []);

  // Timer de selección
  useEffect(() => {
    if (phase !== 'selection' || !isMyTurn) return;
    setSelectionTimer(20);
    const interval = setInterval(() => {
      setSelectionTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isMyTurn, turnKey]);

  // Timer de respuestas
  useEffect(() => {
    if (phase !== 'answering') return;
    const interval = setInterval(() => {
      setAnsweringTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleSelectQuestion = (questionId: string) => {
    if (!isMyTurn || selectedQuestions.has(questionId) || mySelections.length >= 5) return;
    versusService.selectQuestion(matchId, questionId);
  };

  const handleAnswer = (optionIndex: number) => {
    const question = assignedQuestions[currentQuestionIndex];
    if (!question || answers[question.id] !== undefined) return;

    const timeSeconds = Math.floor((Date.now() - answerStartTime) / 1000);
    setAnswers(prev => ({ ...prev, [question.id]: optionIndex }));
    versusService.answerQuestion(matchId, question.id, optionIndex, timeSeconds);
  };

  // Calcular mis puntos y los del oponente correctamente
  const getMyFinalPoints = () => {
    if (!matchResult) return 0;
    // Si gané, soy el winner, sino soy el otro
    if (matchResult.youWon && matchResult.winner) {
      return matchResult.winner.userId === matchResult.player1.userId 
        ? matchResult.player1.totalPoints 
        : matchResult.player2.totalPoints;
    }
    // Si perdí o empate, busco cuál player NO es el winner
    if (matchResult.winner) {
      return matchResult.winner.userId === matchResult.player1.userId 
        ? matchResult.player2.totalPoints 
        : matchResult.player1.totalPoints;
    }
    // Empate - retorno player1 por defecto (ambos tienen lo mismo)
    return matchResult.player1.totalPoints;
  };

  const getOpponentFinalPoints = () => {
    if (!matchResult) return 0;
    if (matchResult.youWon && matchResult.winner) {
      return matchResult.winner.userId === matchResult.player1.userId 
        ? matchResult.player2.totalPoints 
        : matchResult.player1.totalPoints;
    }
    if (matchResult.winner) {
      return matchResult.winner.userId === matchResult.player1.userId 
        ? matchResult.player1.totalPoints 
        : matchResult.player2.totalPoints;
    }
    return matchResult.player2.totalPoints;
  };

 const handlePlayAgain = () => {
    // Limpiar todo el estado del socket
    versusService.removeAllListeners();
    versusService.clearMatchData();
    versusService.disconnect();
    
    // Pequeño delay para asegurar que el socket se desconecta completamente
    setTimeout(() => {
      router.push(claseId ? `/versus?claseId=${claseId}` : '/versus');
    }, 100);
  };

  const handleExit = () => {
    versusService.clearMatchData();
    versusService.disconnect();
    router.push(claseId ? `/clases/${claseId}` : '/dashboard');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F5DEB3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#8B4513' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5DEB3', pb: 4 }}>
      {/* Header */}
      <Paper sx={{ background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)', py: 2, px: 3, borderRadius: 0 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#4CAF50', width: 44, height: 44 }}><Person /></Avatar>
              <Box>
                <Typography sx={{ color: 'white', fontWeight: 600 }}>Vos</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {phase === 'answering' ? `${myPoints} pts` : `${mySelections.length}/5 seleccionadas`}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Chip
                label={phase === 'selection' ? 'SELECCIÓN' : phase === 'answering' ? 'RESPUESTAS' : 'FINALIZADO'}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, mb: 0.5 }}
              />
              {phase === 'selection' && (
                <Box>
                  {isMyTurn ? (
                    <GameTimer seconds={selectionTimer} urgent={selectionTimer <= 5} />
                  ) : (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Esperando rival...
                    </Typography>
                  )}
                </Box>
              )}
              {phase === 'answering' && (
                <GameTimer seconds={answeringTimer} urgent={answeringTimer <= 10} />
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ color: 'white', fontWeight: 600 }}>{opponent?.nombre || '???'}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {phase === 'answering' ? (opponentFinished ? '✅ Terminó' : 'Respondiendo...') : `${opponentSelections}/5`}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#D32F2F', width: 44, height: 44 }}><Person /></Avatar>
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* Alert de error normal */}
      {error && !disconnectMessage && (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Container>
      )}

      {/* Alert de desconexión */}
      {disconnectMessage && (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
          <Alert 
            severity="warning"
            icon={<Cancel />}
            sx={{
              '& .MuiAlert-message': {
                width: '100%',
              },
              bgcolor: '#FFF3E0',
              border: '2px solid #FF9800',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#E65100', mb: 1 }}>
              ⚠️ Oponente desconectado
            </Typography>
            <Typography variant="body2" sx={{ color: '#5D4037', mb: 2 }}>
              Tu rival se ha desconectado de la partida. Serás redirigido a la clase...
            </Typography>
            <LinearProgress 
              sx={{ 
                height: 6, 
                borderRadius: 3,
                bgcolor: 'rgba(255, 152, 0, 0.2)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: '#FF9800',
                  animation: 'progress 3s linear',
                },
                '@keyframes progress': {
                  '0%': { transform: 'translateX(-100%)' },
                  '100%': { transform: 'translateX(0)' },
                }
              }} 
            />
          </Alert>
        </Container>
      )}

        <Container maxWidth="lg" sx={{ mt: 3 }}>
    {/* FASE SELECCIÓN */}
    {phase === 'selection' && (
      <>
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#FFF8E1', borderRadius: 2, border: '1px solid #FFE0B2' }}>
          <Typography sx={{ color: '#3E2723', textAlign: 'center' }}>
            {isMyTurn ? (
              <><strong style={{ color: '#2E7D32' }}>¡Tu turno!</strong> Elegí una pregunta para tu rival</>
            ) : (
              <><strong style={{ color: '#F57C00' }}>Turno del oponente...</strong> Esperando selección</>
            )}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(mySelections.length / 5) * 100}
            sx={{ mt: 2, height: 8, borderRadius: 4, bgcolor: '#FFE0B2', '& .MuiLinearProgress-bar': { bgcolor: '#8B4513' } }}
          />
        </Paper>

        <Grid container spacing={2}>
          {questions.map((q, idx) => {
            const isSelected = selectedQuestions.has(q.id);
            const canSelect = isMyTurn && !isSelected && mySelections.length < 5;

            return (
              <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                <Card
                  onClick={() => canSelect && handleSelectQuestion(q.id)}
                  sx={{
                    cursor: canSelect ? 'pointer' : 'default',
                    bgcolor: isSelected ? '#E0E0E0' : '#FFF',
                    border: canSelect ? '2px solid #8B4513' : '1px solid #E0E0E0',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    opacity: isSelected ? 0.6 : 1,
                    boxShadow: canSelect ? '0 4px 12px rgba(139,69,19,0.2)' : 1,
                    '&:hover': canSelect ? { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(139,69,19,0.25)' } : {},
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip label={`#${idx + 1}`} size="small" sx={{ bgcolor: '#FFF8E1', color: '#8B4513', fontWeight: 600 }} />
                      {isSelected && <Lock sx={{ color: '#999', fontSize: 18 }} />}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isSelected ? '#999' : '#3E2723',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        minHeight: 60,
                      }}
                    >
                      {q.enunciado}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </>
    )}

    {/* FASE RESPUESTAS - Pregunta actual */}
    {phase === 'answering' && assignedQuestions.length > 0 && currentQuestionIndex < 5 && (
      <Paper sx={{ p: 4, borderRadius: 2, bgcolor: '#FFF' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Chip label={`Pregunta ${currentQuestionIndex + 1} de 5`} sx={{ bgcolor: '#8B4513', color: 'white', fontWeight: 600 }} />
          <Typography sx={{ color: '#3E2723', fontWeight: 600 }}>Puntos: <strong style={{ color: '#D2691E' }}>{myPoints}</strong></Typography>
        </Box>

        <Typography variant="h5" sx={{ color: '#3E2723', mb: 4, fontWeight: 500 }}>
          {assignedQuestions[currentQuestionIndex].enunciado}
        </Typography>

        <Grid container spacing={2}>
          {assignedQuestions[currentQuestionIndex].opciones.map((opcion, idx) => (
            <Grid size={{ xs: 12, sm: 6 }} key={idx}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handleAnswer(idx)}
                disabled={answers[assignedQuestions[currentQuestionIndex].id] !== undefined}
                sx={{
                  py: 2,
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  color: '#3E2723',
                  borderColor: '#D2691E',
                  bgcolor: '#FFF8E1',
                  '&:hover': { bgcolor: '#FFE0B2', borderColor: '#8B4513' },
                  '&.Mui-disabled': { color: '#999', bgcolor: '#F5F5F5' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#8B4513', fontSize: 14 }}>
                    {String.fromCharCode(65 + idx)}
                  </Avatar>
                  {opcion}
                </Box>
              </Button>
            </Grid>
          ))}
        </Grid>
      </Paper>
    )}

    {/* PANTALLA DE ESPERA - Terminó de responder */}
    {phase === 'answering' && hasFinishedAnswering && (
      <Box
        sx={{
          position: 'relative',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0, 0, 0, 0.85)',
          borderRadius: 3,
          border: '2px solid #8B4513',
          overflow: 'hidden',
        }}
      >
        {/* Fondo animado */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(139, 69, 19, 0.2) 0%, transparent 70%)',
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.5 },
              '50%': { opacity: 1 },
            },
          }}
        />

        {/* Contenido */}
        <Box sx={{ textAlign: 'center', zIndex: 1, px: 4 }}>
          <Box
            sx={{
              fontSize: '80px',
              mb: 3,
              animation: 'bounce 1s ease-in-out infinite',
              '@keyframes bounce': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-20px)' },
              },
            }}
          >
            🧉
          </Box>

          <Typography
            variant="h4"
            sx={{
              color: '#FFF',
              fontWeight: 700,
              mb: 2,
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            ¡Qué rápido!
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: '#FFE0B2',
              mb: 1,
              fontWeight: 500,
            }}
          >
            Ahora a esperar que tu rival cebe el mate 🧉
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              mb: 4,
            }}
          >
            {opponentFinished ? 'Calculando resultados...' : 'Tu oponente todavía está respondiendo...'}
          </Typography>

          {/* Estadísticas del jugador */}
          <Paper
            sx={{
              display: 'inline-block',
              px: 4,
              py: 2,
              bgcolor: 'rgba(139, 69, 19, 0.3)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              border: '1px solid rgba(139, 69, 19, 0.5)',
            }}
          >
            <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#FFB300', fontWeight: 700 }}>
                  {myPoints}
                </Typography>
                <Typography variant="caption" sx={{ color: '#FFE0B2' }}>
                  Puntos
                </Typography>
              </Box>
              <Box sx={{ width: '1px', height: '40px', bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#4CAF50', fontWeight: 700 }}>
                  {myCorrect}/5
                </Typography>
                <Typography variant="caption" sx={{ color: '#FFE0B2' }}>
                  Correctas
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Loading indicator */}
          <Box sx={{ mt: 4 }}>
            <CircularProgress
              size={50}
              thickness={3}
              sx={{
                color: '#D2691E',
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                },
              }}
            />
          </Box>
        </Box>
      </Box>
    )}
  </Container>

      {/* Modal Resultados */}
      <Dialog open={showResult} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#FFF8E1', borderRadius: 3, border: '2px solid #D2691E' } }}>
        <DialogTitle sx={{ textAlign: 'center', color: '#3E2723', pt: 4 }}>
          {matchResult?.isDraw ? (
            <Box>
              <Typography variant="h2" sx={{ mb: 1 }}>🤝</Typography>
              <Typography variant="h4" sx={{ color: '#FF9800', fontWeight: 700 }}>¡Empate!</Typography>
            </Box>
          ) : matchResult?.youWon ? (
            <Box>
              <EmojiEvents sx={{ fontSize: 60, color: '#D2691E', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#2E7D32', fontWeight: 700 }}>¡Ganaste! 🎉</Typography>
            </Box>
          ) : (
            <Box>
              <Cancel sx={{ fontSize: 60, color: '#D32F2F', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#D32F2F', fontWeight: 700 }}>Perdiste 😔</Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', my: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Avatar sx={{ width: 60, height: 60, bgcolor: '#8B4513', mx: 'auto', mb: 1 }}><Person /></Avatar>
              <Typography sx={{ color: '#3E2723', fontWeight: 600 }}>Vos</Typography>
              <Typography variant="h4" sx={{ color: '#D2691E', fontWeight: 700 }}>
                {getMyFinalPoints()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#8D6E63' }}>puntos</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ color: '#8B4513' }}>VS</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Avatar sx={{ width: 60, height: 60, bgcolor: '#A0522D', mx: 'auto', mb: 1 }}><Person /></Avatar>
              <Typography sx={{ color: '#3E2723', fontWeight: 600 }}>{opponent?.nombre}</Typography>
              <Typography variant="h4" sx={{ color: '#D2691E', fontWeight: 700 }}>
                {getOpponentFinalPoints()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#8D6E63' }}>puntos</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 2 }}>
          <Button variant="outlined" onClick={handleExit} sx={{ color: '#8B4513', borderColor: '#8B4513' }}>
            Volver a la clase
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={handlePlayAgain}
            sx={{ background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)', px: 4 }}
          >
            Jugar de nuevo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}