'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  IconButton,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  RadioButtonChecked as RadioButtonCheckedIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { ejercicioService, Ejercicio } from '@/app/services/ejercicioService';

export default function DetalleEjercicioPage() {
  const router = useRouter();
  const params = useParams();
  const ejercicioId = params.id as string;
  const [ejercicio, setEjercicio] = useState<Ejercicio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteActividades, setDeleteActividades] = useState(false);

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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Volver a la lista de ejercicios">
                <IconButton onClick={() => router.push('/ejercicios')} sx={{ mr: 2 }}>
                  <ArrowBackIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#3E2723' }}>
                Detalle del Ejercicio
              </Typography>
            </Box>
            <Tooltip title="Editar Ejercicio">
              <IconButton
                color="primary"
                onClick={() => router.push(`/ejercicios/${ejercicioId}/editar`)}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar Ejercicio">
              <IconButton color="error" onClick={() => setOpenDeleteDialog(true)}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
            <DialogTitle>Eliminar ejercicio</DialogTitle>
            <DialogContent>
              <Typography>¿Deseas eliminar este ejercicio?</Typography>
              <FormControlLabel
                control={<Checkbox checked={deleteActividades} onChange={(e) => setDeleteActividades(e.target.checked)} />}
                label="Eliminar actividades asociadas"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button>
              <Button color="error" variant="contained" onClick={async () => {
                setOpenDeleteDialog(false);
                try {
                  await ejercicioService.eliminarEjercicio(ejercicioId, deleteActividades);
                  router.push('/ejercicios');
                } catch (err: any) {
                  setError(err.response?.data?.message || 'Error al eliminar ejercicio');
                }
              }}>Eliminar</Button>
            </DialogActions>
          </Dialog>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#8B4513' }}>
            {ejercicio.enunciado}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            <Chip 
              label={ejercicio.tipo.nombre} 
              variant="outlined" 
              sx={{ 
                borderColor: '#8B4513',
                color: '#8B4513'
              }} 
            />
            <Chip 
              label={`Puntos: ${ejercicio.puntos}`} 
              variant="outlined" 
              color="primary" 
            />
            {ejercicio.isVersus && (
              <Chip 
                label="Modo Versus" 
                color="secondary" 
              />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Fecha de Creación:</strong> {new Date(ejercicio.creadoAt).toLocaleString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Typography>

          {ejercicio.tipo.key === 'programming' ? (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#3E2723' }}>
                Ejercicio de Programación
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Este es un ejercicio de programación con tests automatizados.
              </Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => router.push(`/ejercicios/programming/${ejercicio.id}/intentos`)}
              >
                Ver intentos de alumnos
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2, color: '#3E2723' }}>
                Opciones de Respuesta:
              </Typography>
              <List>
                {ejercicio.opciones.map((opcion, index) => (
                  <ListItem key={opcion.id || index} sx={{ pl: 0, py: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {opcion.isCorrecta ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                          )}
                          <span>{opcion.texto}</span>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => router.push('/ejercicios')}
              sx={{ borderColor: '#8B4513', color: '#8B4513' }}
            >
              Volver a la Lista
            </Button>
            <Button
              variant="contained"
              onClick={() => router.push(`/ejercicios/${ejercicioId}/editar`)}
              sx={{
                background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #654321 0%, #A0522D 100%)',
                },
              }}
            >
              Editar Ejercicio
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}