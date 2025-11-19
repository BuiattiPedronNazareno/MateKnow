'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Fab,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  School
} from '@mui/icons-material';
import { ejercicioService, Ejercicio } from '@/app/services/ejercicioService';

export default function EjerciciosPage() {
  const router = useRouter();
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteActividades, setDeleteActividades] = useState(false);

  useEffect(() => {
    const loadEjercicios = async () => {
      try {
        setLoading(true);
        const response = await ejercicioService.obtenerMisEjercicios();
        setEjercicios(response.ejercicios);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar los ejercicios');
      } finally {
        setLoading(false);
      }
    };

    loadEjercicios();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#3E2723' }}>
            Mis Ejercicios
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/ejercicios/crear')}
            sx={{
              background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #654321 0%, #A0522D 100%)',
              },
            }}
          >
            Crear Ejercicio
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {ejercicios.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 8 }}>
            <School sx={{ fontSize: 80, color: '#DEB887', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No tienes ejercicios aún
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Crea tu primer ejercicio para usar en actividades
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/ejercicios/crear')}
              sx={{
                background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #654321 0%, #A0522D 100%)',
                },
              }}
            >
              Crear Ejercicio
            </Button>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {ejercicios.map((ejercicio) => (
              <Box
                key={ejercicio.id}
                sx={{
                  flex: {
                    xs: '1 1 100%',
                    sm: '1 1 calc(50% - 12px)',
                    md: '1 1 calc(33.333% - 16px)'
                  }
                }}
              >
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                    border: ejercicio.isVersus ? '2px solid #D2691E' : '1px solid #E0E0E0',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {ejercicio.tipo.nombre}
                      </Typography>
                      {ejercicio.isVersus && (
                        <Chip label="Modo Versus" color="secondary" size="small" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {ejercicio.enunciado}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={`Puntos: ${ejercicio.puntos}`} size="small" />
                      <Chip label={new Date(ejercicio.creadoAt).toLocaleDateString()} size="small" />
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Tooltip title="Ver Detalles">
                      <IconButton size="small" onClick={() => router.push(`/ejercicios/${ejercicio.id}/detalle`)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar Ejercicio">
                      <IconButton size="small" color="primary" onClick={() => router.push(`/ejercicios/${ejercicio.id}/editar`)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar Ejercicio">
                      <IconButton size="small" color="error" onClick={() => { setDeleteTargetId(ejercicio.id); setOpenDeleteDialog(true); }}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ position: 'fixed', bottom: 24, right: 24, display: { xs: 'block', md: 'none' } }}>
          <Fab
            color="primary"
            sx={{
              background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #654321 0%, #A0522D 100%)',
              },
            }}
            onClick={() => router.push('/ejercicios/crear')}
          >
            <AddIcon />
          </Fab>
        </Box>
        <Dialog open={openDeleteDialog} onClose={() => { setOpenDeleteDialog(false); setDeleteTargetId(null); }}>
          <DialogTitle>Eliminar ejercicio</DialogTitle>
          <DialogContent>
            <Typography>¿Deseas eliminar este ejercicio?</Typography>
            <FormControlLabel
              control={<Checkbox checked={deleteActividades} onChange={(e) => setDeleteActividades(e.target.checked)} />}
              label="Eliminar actividades asociadas"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpenDeleteDialog(false); setDeleteTargetId(null); }}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={async () => {
              const id = deleteTargetId;
              setOpenDeleteDialog(false);
              setDeleteTargetId(null);
              if (!id) return;
              try {
                await ejercicioService.eliminarEjercicio(id, deleteActividades);
                const response = await ejercicioService.obtenerMisEjercicios();
                setEjercicios(response.ejercicios);
              } catch (err: any) {
                setError(err.response?.data?.message || 'Error al eliminar ejercicio');
              }
            }}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}