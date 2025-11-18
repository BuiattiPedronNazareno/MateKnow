'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { ArrowBack, Delete } from '@mui/icons-material';
import { claseService, ClaseDetalle } from '@/app/services/claseService';

export default function EditarClasePage() {
  const router = useRouter();
  const params = useParams();
  const claseId = params.id as string;
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    isPublico: true,
  });
  const [clase, setClase] = useState<ClaseDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadClase();
  }, [claseId]);

  const loadClase = async () => {
    try {
      setLoading(true);
      const response = await claseService.getClaseById(claseId);
      setClase({
        ...response.clase,
        profesores: response.profesores,
        alumnos: response.alumnos,
      });
      setFormData({
        nombre: response.clase.nombre,
        descripcion: response.clase.descripcion,
        isPublico: response.clase.isPublico,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar la clase');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    setError('');
    setSuccess('');
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
      setSaving(true);
      await claseService.updateClase(claseId, formData);
      setSuccess('Clase actualizada exitosamente');
      
      // Redirigir después de 1.5 segundos
      setTimeout(() => {
        router.push(`/clases/${claseId}`);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar la clase');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await claseService.deleteClase(claseId);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar la clase');
      setOpenDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!clase?.isProfesor) {
    return (
      <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="lg">
          <Alert severity="error">
            No tienes permisos para editar esta clase
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#3E2723' }}>
                Configurar Clase
              </Typography>
            </Box>
            <IconButton
              color="error"
              onClick={() => setOpenDeleteDialog(true)}
              disabled={saving}
            >
              <Delete />
            </IconButton>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
              {success}
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
              disabled={saving}
              sx={{ mb: 3 }}
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
              disabled={saving}
              sx={{ mb: 3 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublico}
                  onChange={handleChange}
                  name="isPublico"
                  disabled={saving}
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

            {!formData.isPublico && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Al cambiar la clase a privada, solo podrás agregar nuevos alumnos manualmente.
                Los alumnos actuales no serán afectados.
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => router.back()}
                disabled={saving}
                sx={{ borderColor: '#8B4513', color: '#8B4513' }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={saving}
                sx={{
                  background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                }}
              >
                {saving ? <CircularProgress size={24} /> : 'Guardar Cambios'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Dialog de confirmación de eliminación */}
        <Dialog
          open={openDeleteDialog}
          onClose={() => !deleting && setOpenDeleteDialog(false)}
        >
          <DialogTitle>Eliminar Clase</DialogTitle>
          <DialogContent>
            <Box>
              <Typography variant="body1" gutterBottom>
                ¿Estás seguro de que quieres eliminar esta clase?
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                Esta acción no se puede deshacer.
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Se eliminarán:
              </Typography>
              <Box component="ul" sx={{ mt: 0, pl: 3 }}>
                <li>Todas las actividades de la clase</li>
                <li>Los registros de los alumnos</li>
                <li>Los ejercicios asociados</li>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setOpenDeleteDialog(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              color="error"
              variant="contained"
              disabled={deleting}
            >
              {deleting ? <CircularProgress size={24} /> : 'Eliminar Clase'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}