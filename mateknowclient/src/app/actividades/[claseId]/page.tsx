'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import { ArrowBack, Delete, Add, Edit } from '@mui/icons-material';
import { actividadService } from '@/app/services/actividadService';
import OptionsEditor from './components/OptionsEditor';
import { Radio, RadioGroup, Stack } from '@mui/material';
import { claseService } from '@/app/services/claseService';

export default function ActividadesPage() {
  const params = useParams();
  const claseId = params.claseId as string;
  const router = useRouter();

  const [actividades, setActividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'practica',
    fechaInicio: '',
    fechaFin: '',
    isVisible: true,
    ejercicioIds: [] as string[],
    nuevosEjercicios: [] as any[],
  });
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [isProfesor, setIsProfesor] = useState(false);
  const [editingActividadId, setEditingActividadId] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, [claseId]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const c = await claseService.getClaseById(claseId);
      setIsProfesor(c.clase.isProfesor);
      const res = await actividadService.listarActividades(claseId);
      setActividades(res.actividades || []);
      const ej = await actividadService.listarEjercicios(claseId);
      setEjercicios(ej.ejercicios || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar actividades');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ nombre: '', descripcion: '', tipo: 'practica', fechaInicio: '', fechaFin: '', isVisible: true, ejercicioIds: [], nuevosEjercicios: [] });
    setOpenDialog(true);
    setEditingActividadId(null);
  };

  const openEdit = (actividad: any) => {
    setForm({
      nombre: actividad.nombre,
      descripcion: actividad.descripcion,
      tipo: actividad.tipo || 'practica',
      // Convert ISO datetime from server to value for datetime-local input (local datetime), keep empty if not present
      fechaInicio: actividad.fecha_inicio ? (() => {
        const d = new Date(actividad.fecha_inicio);
        const tzoffset = d.getTimezoneOffset() * 60000; //offset in ms
        return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
      })() : '',
      fechaFin: actividad.fecha_fin ? (() => {
        const d = new Date(actividad.fecha_fin);
        const tzoffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
      })() : '',
      isVisible: !!actividad.is_visible,
      ejercicioIds: (actividad.ejercicios || []).map((e: any) => e.id),
      nuevosEjercicios: [],
    });
    setEditingActividadId(actividad.id);
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (!form.nombre.trim() || !form.descripcion.trim()) {
        setError('Nombre y descripción son obligatorios');
        return;
      }

      if (form.tipo === 'evaluacion' && (!form.fechaInicio || !form.fechaFin)) {
        setError('Las evaluaciones requieren fecha inicio y fin');
        return;
      }

      // Prepare payload: parse metadata JSON if user provided it as string
      const payload: any = { ...form };
      // Convert datetime-local values to ISO 8601 strings in UTC
      if (payload.fechaInicio) payload.fechaInicio = new Date(payload.fechaInicio).toISOString();
      if (payload.fechaFin) payload.fechaFin = new Date(payload.fechaFin).toISOString();
      if (payload.nuevosEjercicios && payload.nuevosEjercicios.length > 0) {
        payload.nuevosEjercicios = payload.nuevosEjercicios.map((e: any) => {
          const copy: any = { ...e };
          // parse metadata if string
          if (typeof copy.metadata === 'string' && copy.metadata.trim()) {
            try {
              copy.metadata = JSON.parse(copy.metadata);
            } catch (err) {
              // keep as string if invalid JSON
            }
          }
          // ensure puntos is number
          copy.puntos = Number(copy.puntos) || 1;
          return copy;
        });
      }

        // Validar opciones si NEW ejercicio MCQ
        if (payload.nuevosEjercicios && payload.nuevosEjercicios.length > 0) {
          for (const e of payload.nuevosEjercicios) {
            if (e.tipo === 'multiple-choice') {
              const opciones = e.opciones || [];
              if (opciones.length < 2) {
                setError('Multiple-choice requiere al menos 2 opciones');
                return;
              }
              if (!opciones.some((o: any) => o.is_correcta)) {
                setError('Multiple-choice requiere al menos una opción marcada como correcta');
                return;
              }
            }
          }
        }

      if (editingActividadId) {
        // The backend's UpdateActividadDto doesn't accept `tipo` or `nuevosEjercicios`.
        // Only send allowed fields to avoid validation errors when editing.
        const allowedKeys = ['nombre', 'descripcion', 'fechaInicio', 'fechaFin', 'isVisible', 'ejercicioIds'];
        const updatePayload: any = {};
        for (const k of allowedKeys) {
          if ((payload as any)[k] !== undefined) updatePayload[k] = (payload as any)[k];
        }
        await actividadService.editarActividad(claseId, editingActividadId, updatePayload as any);
      } else {
        await actividadService.crearActividad(claseId, payload as any);
      }
      setOpenDialog(false);
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear actividad');
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar la actividad junto a los registros de los usuarios alumnos?')) return;
    try {
      await actividadService.eliminarActividad(claseId, id);
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar actividad');
    }
  };

  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => router.push('/dashboard')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#3E2723' }}>
              Actividades de la Clase
            </Typography>
          </Box>
          {isProfesor && (
            <Button startIcon={<Add />} onClick={openCreate} sx={{ background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)', color: 'white' }}>
              Crear Actividad
            </Button>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper sx={{ p: 2, mb: 3 }}>
          <List>
            {actividades.length === 0 && <Typography sx={{ p: 2 }}>No hay actividades aún.</Typography>}
            {actividades.map((a) => (
              <ListItem key={a.id} secondaryAction={isProfesor ? (
                <>
                  <IconButton edge="end" onClick={() => openEdit(a)} sx={{ mr: 1 }}>
                    <Edit />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleEliminar(a.id)}>
                    <Delete />
                  </IconButton>
                </>
              ) : null}>
                <ListItemText primary={a.nombre} secondary={a.descripcion} sx={!a.is_visible ? { color: 'warning.main' } : {}} />
                <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                  {a.tipo === 'evaluacion' && <Chip label={`Evaluación ${a.fecha_inicio ? `(${new Date(a.fecha_inicio).toLocaleDateString()})` : ''}`} />}
                  {!a.is_visible && <Chip label="Oculta" color="warning" />}
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Dialog Crear */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth>
          <DialogTitle>Crear Actividad</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="Nombre" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} sx={{ mb: 2 }} />
            <TextField fullWidth label="Descripción" multiline rows={4} value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} sx={{ mb: 2 }} />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="tipo-label">Tipo</InputLabel>
              <Select labelId="tipo-label" value={form.tipo} label="Tipo" onChange={(e) => setForm({...form, tipo: e.target.value as any})}>
                <MenuItem value="practica">Práctica</MenuItem>
                <MenuItem value="evaluacion">Evaluación</MenuItem>
              </Select>
            </FormControl>

            {form.tipo === 'evaluacion' && (
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField type="datetime-local" label="Fecha Inicio" InputLabelProps={{ shrink: true }} value={form.fechaInicio} onChange={(e) => setForm({...form, fechaInicio: e.target.value})} />
                <TextField type="datetime-local" label="Fecha Fin" InputLabelProps={{ shrink: true }} value={form.fechaFin} onChange={(e) => setForm({...form, fechaFin: e.target.value})} />
              </Box>
            )}

            <FormControlLabel control={<Switch checked={form.isVisible} onChange={(e) => setForm({...form, isVisible: e.target.checked})} />} label="Visible para alumnos" sx={{ mb: 2 }} />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="ejercicios-label">Ejercicios (seleccionar)</InputLabel>
              <Select labelId="ejercicios-label" multiple value={form.ejercicioIds} onChange={(e) => setForm({...form, ejercicioIds: e.target.value as string[]})} renderValue={(selected) => (selected as string[]).map(id => {
                const found = ejercicios.find(x => x.id === id);
                return found ? (found.metadata?.title || found.titulo || found.enunciado || id) : id;
              }).join(', ')}>
                {ejercicios.map((ej) => (
                  <MenuItem key={ej.id} value={ej.id}>{ej.metadata?.title || ej.titulo || ej.enunciado || ej.id}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography sx={{ mb: 1 }}>Crear nuevo ejercicio (opcional)</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
              <Button size="small" onClick={() => alert('HU Ejercicios: Pendiente (no implementado)')} startIcon={<Add />}>Agregar ejercicio</Button>
              <Typography variant="caption" color="text.secondary">Agregar ejercicios desde aquí será implementado en otra HU.</Typography>
            </Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="tipo-ej-label">Tipo de ejercicio</InputLabel>
              <Select labelId="tipo-ej-label" value={form.nuevosEjercicios[0]?.tipo || 'abierta'} label="Tipo de ejercicio" onChange={(e) => setForm({...form, nuevosEjercicios: [{ ...(form.nuevosEjercicios[0]||{}), tipo: e.target.value }]})}>
                <MenuItem value="abierta">Abierta</MenuItem>
                <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                <MenuItem value="verdadero-falso">Verdadero/Falso</MenuItem>
              </Select>
            </FormControl>

            <TextField fullWidth label="Título ejercicio" value={form.nuevosEjercicios[0]?.titulo || ''} onChange={(e) => setForm({...form, nuevosEjercicios: [{ ...(form.nuevosEjercicios[0]||{}), titulo: e.target.value }]})} sx={{ mb: 1 }} />
            <TextField fullWidth label="Enunciado" multiline rows={3} value={form.nuevosEjercicios[0]?.enunciado || ''} onChange={(e) => setForm({...form, nuevosEjercicios: [{ ...(form.nuevosEjercicios[0]||{}), enunciado: e.target.value }]})} sx={{ mb: 2 }} />
            <TextField type="number" fullWidth label="Puntos" value={form.nuevosEjercicios[0]?.puntos ?? 1} onChange={(e) => setForm({...form, nuevosEjercicios: [{ ...(form.nuevosEjercicios[0]||{}), puntos: Number(e.target.value) }]})} sx={{ mb: 2 }} />
            {form.nuevosEjercicios[0]?.tipo === 'multiple-choice' && (
              <OptionsEditor
                opciones={form.nuevosEjercicios[0]?.opciones || []}
                onChange={(opts) => setForm({...form, nuevosEjercicios: [{ ...(form.nuevosEjercicios[0]||{}), opciones: opts }]})}
              />
            )}

            <TextField fullWidth label="Metadata (JSON opcional)" multiline rows={3} value={typeof form.nuevosEjercicios[0]?.metadata === 'object' ? JSON.stringify(form.nuevosEjercicios[0]?.metadata) : (form.nuevosEjercicios[0]?.metadata || '')} onChange={(e) => setForm({...form, nuevosEjercicios: [{ ...(form.nuevosEjercicios[0]||{}), metadata: e.target.value }]})} sx={{ mb: 2 }} />

          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleSubmit} sx={{ background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)' }}>{editingActividadId ? 'Guardar' : 'Crear'}</Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}
