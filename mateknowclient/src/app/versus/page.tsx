'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Container, Paper, Typography, Button, CircularProgress,
  Card, CardContent, Alert, Chip, Avatar, LinearProgress, IconButton,
} from '@mui/material';
import {
  SportsEsports, ArrowBack, Person, EmojiEvents, Cancel,
  CheckCircle, Timer, School,
} from '@mui/icons-material';
import { versusService, MatchData } from '@/app/services/versusService';
import { claseService } from '@/app/services/claseService';

export default function VersusLobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const claseId = searchParams.get('claseId');

  const [status, setStatus] = useState<'idle' | 'connecting' | 'searching' | 'found' | 'error'>('idle');
  const [error, setError] = useState('');
  const [claseNombre, setClaseNombre] = useState('');
  const [searchTime, setSearchTime] = useState(0);

  useEffect(() => {
    if (!claseId) {
      setError('No se especificó una clase. Volvé a entrar desde una clase.');
      setStatus('error');
      return;
    }

    claseService.getClaseById(claseId).then(res => {
      setClaseNombre(res.clase.nombre);
    }).catch(() => {
      setClaseNombre('Clase');
    });
  }, [claseId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'searching') {
      interval = setInterval(() => setSearchTime(t => t + 1), 1000);
    } else {
      setSearchTime(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleBuscarPartida = () => {
    if (!claseId) return;

    setStatus('connecting');
    setError('');

    try {
      versusService.connect();

      versusService.onConnected(() => {
        console.log('✅ Conectado, buscando partida...');
        setStatus('searching');
        versusService.searchMatch(claseId);
      });

      versusService.onSearching(() => {
        setStatus('searching');
      });

      versusService.onMatchFound((data: MatchData) => {
        console.log('🎮 Match encontrado:', data);
        setStatus('found');
        router.push(`/versus/${data.lobbyId}?claseId=${claseId}`);
      });

      versusService.onError((data) => {
        console.error('❌ Error:', data.message);
        setError(data.message);
        setStatus('error');
      });

      versusService.onSearchCancelled(() => {
        setStatus('idle');
      });

    } catch (err: any) {
      setError(err.message || 'Error al conectar');
      setStatus('error');
    }
  };

  const handleCancelar = () => {
    versusService.cancelSearch();
    versusService.removeAllListeners();
    versusService.disconnect();
    setStatus('idle');
  };

  const handleVolver = () => {
    versusService.removeAllListeners();
    versusService.disconnect();
    router.push(claseId ? `/clases/${claseId}` : '/dashboard');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5DEB3', py: 4 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton onClick={handleVolver} sx={{ color: '#3E2723', mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#3E2723', display: 'flex', alignItems: 'center', gap: 1 }}>
              <SportsEsports sx={{ fontSize: 40, color: '#8B4513' }} />
              Modo Versus
            </Typography>
            {claseNombre && (
              <Chip 
                icon={<School sx={{ color: '#5D4037 !important' }} />}
                label={claseNombre}
                sx={{ mt: 1, bgcolor: 'rgba(139, 69, 19, 0.15)', color: '#5D4037', fontWeight: 500 }}
              />
            )}
          </Box>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Card Principal */}
        <Card
          sx={{
            borderRadius: 3,
            bgcolor: '#FFF8E1',
            border: '2px solid #D2691E',
            boxShadow: '0 8px 32px rgba(139, 69, 19, 0.2)',
            overflow: 'hidden',
          }}
        >
          {/* Banner Superior */}
          <Box
            sx={{
              background: 'linear-gradient(90deg, #8B4513 0%, #D2691E 50%, #CD853F 100%)',
              py: 3,
              px: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
              ⚔️ Duelo 1 vs 1 ⚔️
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mt: 1 }}>
              Desafiá a un compañero de tu clase en tiempo real
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            {/* Estado: Idle */}
            {status === 'idle' && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 4 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: '#8B4513', mx: 'auto', mb: 1 }}>
                      <Person sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography sx={{ color: '#3E2723', fontWeight: 600 }}>Vos</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h3" sx={{ color: '#D2691E', fontWeight: 900 }}>VS</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: '#D7CCC8', mx: 'auto', mb: 1 }}>
                      <Person sx={{ fontSize: 40, color: '#8D6E63' }} />
                    </Avatar>
                    <Typography sx={{ color: '#8D6E63' }}>???</Typography>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  onClick={handleBuscarPartida}
                  disabled={!claseId}
                  sx={{
                    px: 6,
                    py: 2,
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(139, 69, 19, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #654321 0%, #A0522D 100%)',
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  🎮 BUSCAR PARTIDA
                </Button>

                {/* Reglas */}
                <Paper sx={{ mt: 4, p: 3, bgcolor: 'rgba(139, 69, 19, 0.08)', borderRadius: 2, border: '1px dashed #D2691E' }}>
                  <Typography variant="h6" sx={{ color: '#8B4513', mb: 2, fontWeight: 600 }}>
                    📋 Reglas del Duelo
                  </Typography>
                  <Box sx={{ textAlign: 'left', color: '#5D4037' }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      ⏱️ <strong>Fase 1 - Selección (20s por turno):</strong> Elegí 5 preguntas para tu rival
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      📝 <strong>Fase 2 - Respuestas (90s total):</strong> Respondé las 5 preguntas que te eligieron
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      ⚡ <strong>Puntuación:</strong> 50 pts base + bonus por velocidad (máx 95 pts)
                    </Typography>
                    <Typography variant="body2">
                      🏆 <strong>Victoria:</strong> Gana quien sume más puntos
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}

            {/* Estado: Connecting */}
            {status === 'connecting' && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress size={60} sx={{ color: '#8B4513', mb: 3 }} />
                <Typography variant="h6" sx={{ color: '#3E2723' }}>
                  Conectando al servidor...
                </Typography>
              </Box>
            )}

            {/* Estado: Searching */}
            {status === 'searching' && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
                  <CircularProgress size={120} thickness={2} sx={{ color: '#8B4513' }} />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h4" sx={{ color: '#3E2723', fontWeight: 700 }}>
                      {formatTime(searchTime)}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="h5" sx={{ color: '#3E2723', mb: 1, fontWeight: 600 }}>
                  Buscando oponente...
                </Typography>
                <Typography variant="body2" sx={{ color: '#8D6E63', mb: 3 }}>
                  Esperando a otro jugador de tu clase
                </Typography>

                <LinearProgress 
                  sx={{ 
                    mb: 3, 
                    height: 6, 
                    borderRadius: 3,
                    bgcolor: 'rgba(139, 69, 19, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #8B4513, #D2691E, #CD853F)',
                      borderRadius: 3,
                    }
                  }} 
                />

                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={handleCancelar}
                  sx={{ borderColor: '#8B4513', color: '#8B4513', '&:hover': { bgcolor: 'rgba(139, 69, 19, 0.1)' } }}
                >
                  Cancelar búsqueda
                </Button>
              </Box>
            )}

            {/* Estado: Found */}
            {status === 'found' && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CheckCircle sx={{ fontSize: 80, color: '#2E7D32', mb: 2 }} />
                <Typography variant="h4" sx={{ color: '#3E2723', fontWeight: 700, mb: 1 }}>
                  ¡Oponente encontrado!
                </Typography>
                <Typography variant="body1" sx={{ color: '#5D4037', mb: 3 }}>
                  Preparando el duelo...
                </Typography>
                <CircularProgress size={30} sx={{ color: '#2E7D32' }} />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Stats placeholder */}
        <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'center' }}>
          <Paper sx={{ p: 2, bgcolor: '#FFF8E1', borderRadius: 2, textAlign: 'center', minWidth: 100, border: '1px solid #D2691E' }}>
            <EmojiEvents sx={{ color: '#FFB300', fontSize: 30 }} />
            <Typography variant="h5" sx={{ color: '#3E2723', fontWeight: 700 }}>-</Typography>
            <Typography variant="caption" sx={{ color: '#8D6E63' }}>Victorias</Typography>
          </Paper>
          <Paper sx={{ p: 2, bgcolor: '#FFF8E1', borderRadius: 2, textAlign: 'center', minWidth: 100, border: '1px solid #D2691E' }}>
            <Timer sx={{ color: '#8B4513', fontSize: 30 }} />
            <Typography variant="h5" sx={{ color: '#3E2723', fontWeight: 700 }}>-</Typography>
            <Typography variant="caption" sx={{ color: '#8D6E63' }}>Partidas</Typography>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}