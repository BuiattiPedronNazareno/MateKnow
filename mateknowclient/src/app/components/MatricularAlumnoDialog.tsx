'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
} from '@mui/material';
import { PersonAdd, Search } from '@mui/icons-material';

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

interface MatricularAlumnoDialogProps {
  open: boolean;
  onClose: () => void;
  onMatricular: (usuarioId: string) => Promise<void>;
  claseId: string;
}

export default function MatricularAlumnoDialog({
  open,
  onClose,
  onMatricular,
  claseId,
}: MatricularAlumnoDialogProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<Usuario | null>(null);

  const handleBuscar = async () => {
    if (!email.trim()) {
      setError('Por favor ingresa un email');
      return;
    }

    setLoading(true);
    setError('');
    setUsuarioEncontrado(null);

    try {
      const token = localStorage.getItem('access_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(
        `${API_URL}/usuarios/buscar?email=${encodeURIComponent(email.trim())}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Usuario no encontrado');
      }

      const data = await response.json();
      setUsuarioEncontrado(data.usuario);
    } catch (err: any) {
      setError(err.message || 'Error al buscar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleMatricular = async () => {
    if (!usuarioEncontrado) return;

    setLoading(true);
    setError('');

    try {
      await onMatricular(usuarioEncontrado.id);
      setSuccess(`${usuarioEncontrado.nombre} ${usuarioEncontrado.apellido} ha sido matriculado exitosamente`);
      setUsuarioEncontrado(null);
      setEmail('');
      
      // Cerrar después de 2 segundos
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al matricular alumno');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setError('');
      setSuccess('');
      setUsuarioEncontrado(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Matricular Alumno Manualmente</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          Esta clase es privada. Busca al usuario por su email para matricularlo.
        </Alert>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            label="Email del alumno"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@gmail.com"
            disabled={loading}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleBuscar();
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleBuscar}
            disabled={loading || !email.trim()}
            sx={{
              background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
              minWidth: '100px',
              '&:hover': {
                background: 'linear-gradient(135deg, #654321 0%, #A0522D 100%)',
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : <Search />}
          </Button>
        </Box>

        {usuarioEncontrado && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Usuario encontrado:
            </Typography>
            <List>
              <ListItem
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={handleMatricular}
                    disabled={loading}
                    sx={{ color: '#8B4513' }}
                  >
                    <PersonAdd />
                  </IconButton>
                }
                sx={{
                  border: '1px solid #E0E0E0',
                  borderRadius: 1,
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: '#8B4513' }}>
                    {usuarioEncontrado.nombre[0]}{usuarioEncontrado.apellido[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${usuarioEncontrado.nombre} ${usuarioEncontrado.apellido}`}
                  secondary={usuarioEncontrado.email}
                />
              </ListItem>
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}