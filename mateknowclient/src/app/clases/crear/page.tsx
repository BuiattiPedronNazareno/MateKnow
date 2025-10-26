'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { claseService } from '@/app/services/claseService';

export default function CrearClasePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    isPublico: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      setError('El nombre de la clase es obligatorio');
      return;
    }

    if (!formData.descripcion.trim()) {
      setError('La descripción de la clase es obligatoria');
      return;
    }

    try {
      setLoading(true);
      const response = await claseService.createClase(formData);
      
      // Redirigir a la clase creada
      router.push(`/clases/${response.clase.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear la clase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#3E2723' }}>
              Crear Nueva Clase
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              label="Nombre de la Clase"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              autoFocus
              disabled={loading}
              sx={{ mb: 3 }}
              helperText="Ej: Matemática I, Programación Avanzada, Historia Argentina"
            />

            <TextField
              fullWidth
              label="Descripción"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              required
              multiline
              rows={4}
              disabled={loading}
              sx={{ mb: 3 }}
              helperText="Describe brevemente el contenido de la clase"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublico}
                  onChange={handleChange}
                  name="isPublico"
                  disabled={loading}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Clase Pública
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formData.isPublico
                      ? 'Cualquier persona con el código puede unirse'
                      : 'Solo puedes matricular alumnos manualmente'}
                  </Typography>
                </Box>
              }
              sx={{ mb: 4 }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => router.back()}
                disabled={loading}
                sx={{ borderColor: '#8B4513', color: '#8B4513' }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{
                  background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Crear Clase'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}