'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import EjercicioForm from '@/app/components/EjercicioForm';
import { ejercicioService, Ejercicio } from '@/app/services/ejercicioService';

export default function EditarEjercicioPage() {
  const router = useRouter();
  const params = useParams();
  const ejercicioId = params.id as string;
  const [ejercicio, setEjercicio] = useState<Ejercicio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEjercicio = async () => {
      try {
        setLoading(true);
        const response = await ejercicioService.obtenerEjercicioPorId(ejercicioId);
        setEjercicio(response.ejercicio);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar el ejercicio');
      } finally {
        setLoading(false);
      }
    };

    loadEjercicio();
  }, [ejercicioId]);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    setError('');
    try {
      await ejercicioService.actualizarEjercicio(ejercicioId, data);
      router.push(`/ejercicios/${ejercicioId}/detalle`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar el ejercicio');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="md">
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Container>
      </Box>
    );
  }

  if (!ejercicio) {
    return (
      <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="md">
          <Alert severity="error">
            Ejercicio no encontrado
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Tooltip title="Volver a los detalles del ejercicio">
              <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#3E2723' }}>
              Editar Ejercicio
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <EjercicioForm
            initialData={{
              id: ejercicio.id,
              tipoId: ejercicio.tipo.id,
              enunciado: ejercicio.enunciado,
              puntos: ejercicio.puntos,
              isVersus: ejercicio.isVersus,
              opciones: ejercicio.opciones,
            }}
            onSubmit={handleSubmit}
            submitButtonText="Actualizar Ejercicio"
            loading={loading}
            error={''}
            onCancel={() => router.push(`/ejercicios/${ejercicioId}/detalle`)}
          />
        </Paper>
      </Container>
    </Box>
  );
}