'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import EjercicioForm from '@/app/components/EjercicioForm';
import { ejercicioService } from '@/app/services/ejercicioService';

export default function CrearEjercicioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (data: any) => {
    setLoading(true);
    setError('');
    try {
      await ejercicioService.crearEjercicio(data);
      router.push('/ejercicios');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear el ejercicio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Tooltip title="Volver a la lista de ejercicios">
              <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#3E2723' }}>
              ➕ Crear Nuevo Ejercicio
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <EjercicioForm
            onSubmit={handleSubmit}
            submitButtonText="Crear Ejercicio"
            loading={loading}
            error={''}
          />
        </Paper>
      </Container>
    </Box>
  );
}