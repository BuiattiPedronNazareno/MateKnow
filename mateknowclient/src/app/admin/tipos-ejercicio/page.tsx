import React, { useEffect, useState } from 'react';
import { 
  Box, Container, Paper, Typography, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, List, ListItem, 
  ListItemText, ListItemSecondaryAction, IconButton, Alert,
  Chip, Divider
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

// Simulación del servicio (reemplaza con tu import real)
const ejercicioService = {
  obtenerTiposEjercicio: async () => {
    // Aquí deberías llamar a tu API real
    return { tipos: [] };
  },
  crearTipoEjercicio: async (data: any) => {
    console.log('Crear:', data);
  },
  actualizarTipoEjercicio: async (id: string, data: any) => {
    console.log('Actualizar:', id, data);
  },
  eliminarTipoEjercicio: async (id: string) => {
    console.log('Eliminar:', id);
  }
};

interface TipoEjercicio {
  id: string;
  key: string;
  nombre: string;
  descripcion?: string;
}

export default function TiposEjercicioPage() {
  const [tipos, setTipos] = useState<TipoEjercicio[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TipoEjercicio | null>(null);
  const [key, setKey] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<TipoEjercicio | null>(null);
  const [error, setError] = useState('');

  const loadTipos = async () => {
    try {
      const res = await ejercicioService.obtenerTiposEjercicio();
      setTipos(res.tipos || []);
    } catch (err) {
      console.error(err);
      setError('Error al cargar tipos');
    }
  };

  useEffect(() => {
    loadTipos();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setKey('');
    setNombre('');
    setDescripcion('');
    setOpen(true);
  };

  const openEdit = (t: TipoEjercicio) => {
    setEditing(t);
    setKey(t.key);
    setNombre(t.nombre);
    setDescripcion(t.descripcion || '');
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!key.trim() || !nombre.trim()) {
        setError('Key y nombre son obligatorios');
        return;
      }

      if (editing) {
        await ejercicioService.actualizarTipoEjercicio(editing.id, { nombre, descripcion });
      } else {
        await ejercicioService.crearTipoEjercicio({ key: key.toLowerCase(), nombre, descripcion });
      }
      setOpen(false);
      await loadTipos();
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await ejercicioService.eliminarTipoEjercicio(deleteCandidate.id);
      setDeleteCandidate(null);
      await loadTipos();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al eliminar');
    }
  };

  // Lista de tipos recomendados
  const tiposRecomendados = [
    { key: 'multiple-choice', nombre: 'Multiple Choice', descripcion: 'Ejercicio de selección múltiple' },
    { key: 'true_false', nombre: 'Verdadero/Falso', descripcion: 'Ejercicio de verdadero o falso' },
    { key: 'abierta', nombre: 'Pregunta Abierta', descripcion: 'Ejercicio de respuesta libre' },
    { key: 'latex', nombre: 'LaTeX', descripcion: 'Ejercicio con fórmulas matemáticas' },
    { key: 'programming', nombre: 'Programación', descripcion: 'Ejercicio de código con tests automatizados' },
  ];

  const crearTipoRecomendado = async (tipo: any) => {
    try {
      await ejercicioService.crearTipoEjercicio(tipo);
      await loadTipos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear');
    }
  };

  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#3E2723' }}>
              Tipos de Ejercicio
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={openCreate}
              sx={{ bgcolor: '#8B4513' }}
            >
              Crear tipo
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          {/* Tipos recomendados faltantes */}
          {tiposRecomendados.filter(tr => !tipos.find(t => t.key === tr.key)).length > 0 && (
            <Box sx={{ mb: 3, p: 2, bgcolor: '#FFF3E0', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                ⚠️ Tipos recomendados faltantes:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {tiposRecomendados
                  .filter(tr => !tipos.find(t => t.key === tr.key))
                  .map(tipo => (
                    <Chip 
                      key={tipo.key}
                      label={`+ ${tipo.nombre}`}
                      onClick={() => crearTipoRecomendado(tipo)}
                      sx={{ cursor: 'pointer', bgcolor: 'white' }}
                    />
                  ))
                }
              </Box>
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />

          <List>
            {tipos.map((t) => (
              <ListItem 
                key={t.id} 
                sx={{ 
                  bgcolor: 'rgba(139, 69, 19, 0.05)', 
                  mb: 1, 
                  borderRadius: 1,
                  border: '1px solid rgba(139, 69, 19, 0.1)'
                }}
              >
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t.nombre}
                      </Typography>
                      <Chip label={t.key} size="small" variant="outlined" />
                    </Box>
                  }
                  secondary={t.descripcion || 'Sin descripción'}
                />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => openEdit(t)} aria-label="editar" size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => setDeleteCandidate(t)} aria-label="eliminar" size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {tipos.length === 0 && (
              <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                No hay tipos de ejercicio creados
              </Typography>
            )}
          </List>
        </Paper>

        {/* Dialog Crear/Editar */}
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>{editing ? 'Editar tipo' : 'Crear tipo'}</DialogTitle>
          <DialogContent>
            {!editing && (
              <TextField 
                value={key} 
                onChange={(e) => setKey(e.target.value)} 
                label="Key (identificador único)" 
                fullWidth 
                margin="normal"
                helperText="Ej: programming, multiple-choice"
              />
            )}
            <TextField 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              label="Nombre" 
              fullWidth 
              margin="normal" 
            />
            <TextField 
              value={descripcion} 
              onChange={(e) => setDescripcion(e.target.value)} 
              label="Descripción" 
              fullWidth 
              margin="normal"
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#8B4513' }}>
              Guardar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Eliminar */}
        <Dialog open={!!deleteCandidate} onClose={() => setDeleteCandidate(null)}>
          <DialogTitle>Eliminar tipo</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Eliminar tipo "{deleteCandidate?.nombre}"? Esta acción es irreversible.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteCandidate(null)}>Cancelar</Button>
            <Button onClick={handleDelete} variant="contained" color="error">
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}