'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  Fab,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Quiz,
  ArrowBack,
  EmojiEvents,
} from '@mui/icons-material';
import { ejercicioService, Ejercicio } from '@/app/services/ejercicioService';
import { authService } from '@/app/services/authService';

export default function EjerciciosPage() {
  const router = useRouter();
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteActivityDialogOpen, setDeleteActivityDialogOpen] = useState(false);
  const [selectedEjercicio, setSelectedEjercicio] = useState<Ejercicio | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadEjercicios();
  }, [mounted, router]);

  const loadEjercicios = async () => {
    try {
      setLoading(true);
      const response = await ejercicioService.getMisEjercicios();
      setEjercicios(response.ejercicios);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar ejercicios');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, ejercicio: Ejercicio) => {
    setAnchorEl(event.currentTarget);
    setSelectedEjercicio(ejercicio);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEjercicio(null);
  };

  const handleEdit = () => {
    if (selectedEjercicio) {
      router.push(`/ejercicios/${selectedEjercicio.id}/editar`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = async (deleteActividades: boolean) => {
    if (!selectedEjercicio) return;

    try {
      setDeleting(true);
      await ejercicioService.deleteEjercicio(selectedEjercicio.id, deleteActividades);
      setDeleteDialogOpen(false);
      setDeleteActivityDialogOpen(false);
      await loadEjercicios();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar ejercicio');
    } finally {
      setDeleting(false);
    }
  };

  const getTipoColor = (tipoKey: string) => {
    switch (tipoKey) {
      case 'choice':
        return '#8B4513';
      case 'match':
        return '#D2691E';
      case 'true_false':
        return '#A0522D';
      default:
        return '#666';
    }
  };

  if (!mounted || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => router.push('/dashboard')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#3E2723' }}>
                📝 Mis Ejercicios
              </Typography>
              <Typography variant="body2" sx={{ color: '#5D4037', mt: 0.5 }}>
                Crea y gestiona tus ejercicios
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/ejercicios/crear')}
            sx={{
              background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
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

        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <Card sx={{ flex: 1, minWidth: '200px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total de Ejercicios
              </Typography>
              <Typography variant="h3" sx={{ color: '#8B4513' }}>
                {ejercicios.length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, minWidth: '200px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Modo Versus
              </Typography>
              <Typography variant="h3" sx={{ color: '#D2691E' }}>
                {ejercicios.filter(e => e.isVersus).length}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {ejercicios.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 8 }}>
            <Quiz sx={{ fontSize: 80, color: '#DEB887', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No tienes ejercicios aún
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Crea tu primer ejercicio para empezar
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/ejercicios/crear')}
              sx={{
                background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
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
                    md: '1 1 calc(33.333% - 16px)',
                  },
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
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Chip
                        label={ejercicio.tipo.nombre}
                        size="small"
                        sx={{
                          bgcolor: getTipoColor(ejercicio.tipo.key),
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, ejercicio)}>
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Typography
                      variant="body1"
                      sx={{
                        mb: 2,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {ejercicio.enunciado}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      <Chip
                        label={`${ejercicio.puntos} pts`}
                        size="small"
                        variant="outlined"
                      />
                      {ejercicio.isVersus && (
                        <Chip
                          icon={<EmojiEvents />}
                          label="Versus"
                          size="small"
                          color="warning"
                        />
                      )}
                      <Chip
                        label={`${ejercicio.opciones.length} opciones`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>

                  <CardActions>
                    <Button
                      size="small"
                      fullWidth
                      variant="contained"
                      onClick={() => router.push(`/ejercicios/${ejercicio.id}/editar`)}
                      sx={{
                        background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                      }}
                    >
                      Ver Detalles
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Box>
        )}

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleEdit}>
            <Edit sx={{ mr: 1 }} /> Editar
          </MenuItem>
          <MenuItem onClick={handleDeleteClick}>
            <Delete sx={{ mr: 1 }} /> Eliminar
          </MenuItem>
        </Menu>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => !deleting && setDeleteDialogOpen(false)}
        >
          <DialogTitle>Eliminar Ejercicio</DialogTitle>
          <DialogContent>
            <DialogContentText>
              ¿Estás seguro de que quieres eliminar este ejercicio?
              <br /><br />
              Este ejercicio puede estar asociado a actividades.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteActivityDialogOpen(true);
              }}
              disabled={deleting}
            >
              Continuar
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={deleteActivityDialogOpen}
          onClose={() => !deleting && setDeleteActivityDialogOpen(false)}
        >
          <DialogTitle>Eliminar Actividades Asociadas</DialogTitle>
          <DialogContent>
            <DialogContentText>
              ¿Deseas eliminar también todas las actividades que contienen este ejercicio?
              <br /><br />
              <strong>Sí:</strong> Se eliminará el ejercicio y todas sus actividades asociadas.
              <br />
              <strong>No:</strong> Solo se eliminará el ejercicio (las actividades se mantendrán sin este ejercicio).
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteActivityDialogOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              onClick={() => handleDelete(false)}
              disabled={deleting}
              variant="outlined"
            >
              No, solo el ejercicio
            </Button>
            <Button
              onClick={() => handleDelete(true)}
              disabled={deleting}
              color="error"
              variant="contained"
            >
              {deleting ? <CircularProgress size={24} /> : 'Sí, eliminar todo'}
            </Button>
          </DialogActions>
        </Dialog>

        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
          }}
          onClick={() => router.push('/ejercicios/crear')}
        >
          <Add />
        </Fab>
      </Container>
    </Box>
  );
}