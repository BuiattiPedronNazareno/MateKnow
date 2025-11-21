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

    // Cargar nombre de la clase
    claseService.getClaseById(claseId).then(res => {
      setClaseNombre(res.clase.nombre);
    }).catch(() => {
      setClaseNombre('Clase');
    });

    // NO desconectar en cleanup - la conexión se mantiene para la partida
  }, [claseId]);

  // Timer de búsqueda
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
      const socket = versusService.connect();

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
        
        // Redirigir inmediatamente - los datos ya están guardados en el servicio
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
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton onClick={handleVolver} sx={{ color: 'white', mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
              <SportsEsports sx={{ fontSize: 40, color: '#E91E63' }} />
              Modo Versus
            </Typography>
            {claseNombre && (
              <Chip 
                icon={<School sx={{ color: 'white !important' }} />}
                label={claseNombre}
                sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }}
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
            borderRadius: 4,
            background: 'linear-gradient(145deg, #1e1e30 0%, #2d2d44 100%)',
            border: '1px solid rgba(233, 30, 99, 0.3)',
            boxShadow: '0 8px 32px rgba(233, 30, 99, 0.2)',
            overflow: 'hidden',
          }}
        >
          {/* Banner Superior */}
          <Box
            sx={{
              background: 'linear-gradient(90deg, #7B1FA2 0%, #E91E63 50%, #FF5722 100%)',
              py: 3,
              px: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
              ⚔️ Duelo 1 vs 1 ⚔️
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
              Desafiá a un compañero de tu clase en tiempo real
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            {/* Estado: Idle */}
            {status === 'idle' && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 4 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: '#7B1FA2', mx: 'auto', mb: 1 }}>
                      <Person sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography sx={{ color: 'white', fontWeight: 600 }}>Vos</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h3" sx={{ color: '#E91E63', fontWeight: 900 }}>VS</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: '#424242', mx: 'auto', mb: 1 }}>
                      <Person sx={{ fontSize: 40, color: '#666' }} />
                    </Avatar>
                    <Typography sx={{ color: '#888' }}>???</Typography>
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
                    background: 'linear-gradient(90deg, #7B1FA2 0%, #E91E63 100%)',
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(233, 30, 99, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(90deg, #6A1B9A 0%, #C2185B 100%)',
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  🎮 BUSCAR PARTIDA
                </Button>

                {/* Reglas */}
                <Paper sx={{ mt: 4, p: 3, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ color: '#E91E63', mb: 2, fontWeight: 600 }}>
                    📋 Reglas del Duelo
                  </Typography>
                  <Box sx={{ textAlign: 'left', color: 'rgba(255,255,255,0.8)' }}>
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
                <CircularProgress size={60} sx={{ color: '#E91E63', mb: 3 }} />
                <Typography variant="h6" sx={{ color: 'white' }}>
                  Conectando al servidor...
                </Typography>
              </Box>
            )}

            {/* Estado: Searching */}
            {status === 'searching' && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
                  <CircularProgress
                    size={120}
                    thickness={2}
                    sx={{ color: '#E91E63' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                      {formatTime(searchTime)}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="h5" sx={{ color: 'white', mb: 1, fontWeight: 600 }}>
                  Buscando oponente...
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
                  Esperando a otro jugador de tu clase
                </Typography>

                <LinearProgress 
                  sx={{ 
                    mb: 3, 
                    height: 6, 
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #7B1FA2, #E91E63, #FF5722)',
                      borderRadius: 3,
                    }
                  }} 
                />

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={handleCancelar}
                  sx={{ borderColor: '#E91E63', color: '#E91E63' }}
                >
                  Cancelar búsqueda
                </Button>
              </Box>
            )}

            {/* Estado: Found */}
            {status === 'found' && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CheckCircle sx={{ fontSize: 80, color: '#4CAF50', mb: 2 }} />
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
                  ¡Oponente encontrado!
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
                  Preparando el duelo...
                </Typography>
                <CircularProgress size={30} sx={{ color: '#4CAF50' }} />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Stats placeholder */}
        <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'center' }}>
          <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, textAlign: 'center', minWidth: 100 }}>
            <EmojiEvents sx={{ color: '#FFD700', fontSize: 30 }} />
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>-</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Victorias</Typography>
          </Paper>
          <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, textAlign: 'center', minWidth: 100 }}>
            <Timer sx={{ color: '#E91E63', fontSize: 30 }} />
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>-</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Partidas</Typography>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}