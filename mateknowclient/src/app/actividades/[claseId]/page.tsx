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
  ListItemButton,
  Alert,
  Tooltip
} from '@mui/material';
import { 
  ArrowBack, 
  Delete, 
  Add, 
  Edit, 
  Visibility, 
  VisibilityOff, 
  History, 
  PlayArrow, 
  Close, 
  AccessTime 
} from '@mui/icons-material';
import { actividadService } from '@/app/services/actividadService';
import OptionsEditor from './components/OptionsEditor';
import { Radio, RadioGroup } from '@mui/material';
import { claseService } from '@/app/services/claseService';

export default function ActividadesPage() {
  const params = useParams();
  const claseId = params.claseId as string;
  const router = useRouter();

  const [actividades, setActividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  
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

  const [openHistorialDialog, setOpenHistorialDialog] = useState(false);
  const [historialIntentos, setHistorialIntentos] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [actividadHistorialNombre, setActividadHistorialNombre] = useState('');
  const [actividadHistorialId, setActividadHistorialId] = useState('');

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
      fechaInicio: actividad.fecha_inicio ? (() => {
        const d = new Date(actividad.fecha_inicio);
        const tzoffset = d.getTimezoneOffset() * 60000; 
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

      const payload: any = { ...form };
      if (payload.fechaInicio) payload.fechaInicio = new Date(payload.fechaInicio).toISOString();
      if (payload.fechaFin) payload.fechaFin = new Date(payload.fechaFin).toISOString();
      
      if (payload.nuevosEjercicios && payload.nuevosEjercicios.length > 0) {
        payload.nuevosEjercicios = payload.nuevosEjercicios.map((e: any) => {
          const copy: any = { ...e };
          if (typeof copy.metadata === 'string' && copy.metadata.trim()) {
            try { copy.metadata = JSON.parse(copy.metadata); } catch (err) { }
          }
          copy.puntos = Number(copy.puntos) || 1;
          return copy;
        });

        for (const e of payload.nuevosEjercicios) {
            if (e.tipo === 'multiple-choice') {
              const opciones = e.opciones || [];
              if (opciones.length < 2) { setError('Multiple-choice requiere al menos 2 opciones'); return; }
              if (!opciones.some((o: any) => o.is_correcta)) { setError('Multiple-choice requiere al menos una opción correcta'); return; }
            }
            if (e.tipo === 'verdadero-falso') {
              const opts = e.opciones || [];
              if (opts.length !== 2 || opts.filter((o:any) => o.is_correcta).length !== 1) { setError('Verdadero/Falso requiere 2 opciones y una correcta'); return; }
            }
        }
      }

      if (editingActividadId) {
        const allowedKeys = ['nombre', 'descripcion', 'fechaInicio', 'fechaFin', 'isVisible', 'ejercicioIds'];
        const updatePayload: any = {};
        for (const k of allowedKeys) {
          if ((payload as any)[k] !== undefined) updatePayload[k] = (payload as any)[k];
        }
        setOpenDialog(false);
        await actividadService.editarActividad(claseId, editingActividadId, updatePayload as any);
      } else {
        setOpenDialog(false);
        await actividadService.crearActividad(claseId, payload as any);
      }
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear actividad');
    }
  };

  const handleEliminar = async (id: string | null) => {
    if (!id) return;
    try {
      await actividadService.eliminarActividad(claseId, id);
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar actividad');
    }
  };

  // --- MÉTODOS NUEVOS PARA HISTORIAL ---

  const handleVerHistorial = async (actividadId: string, nombre: string) => {
    setActividadHistorialNombre(nombre);
    setOpenHistorialDialog(true);
    setLoadingHistorial(true);
    try {
      const res = await actividadService.getHistorial(claseId, actividadId);
      setHistorialIntentos(res.intentos || []);
    } catch (err) {
      console.error(err);
      setHistorialIntentos([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleVerRevision = (actividadId: string, intentoId: string) => {
    router.push(`/actividades/${claseId}/corregir/${actividadId}?intentoId=${intentoId}&mode=view`);
  };

  const handleComenzar = (actividadId: string) => {
    router.push(`/actividades/${claseId}/realizar/${actividadId}`);
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

        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <List>
            {actividades.length === 0 && <Typography sx={{ p: 2 }}>No hay actividades aún.</Typography>}
            
            {actividades.map((a) => (
              <ListItem 
                key={a.id} 
                disablePadding 
                sx={{ mb: 1, bgcolor: 'white', borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                secondaryAction={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* ACCIONES ALUMNO */}
                    {!isProfesor && (
                        <>
                            <Tooltip title="Ver historial">
                                <IconButton onClick={() => handleVerHistorial(a.id, a.nombre)} size="small" sx={{ color: '#8B4513' }}>
                                    <History />
                                </IconButton>
                            </Tooltip>
                            <Button 
                                variant="contained" 
                                size="small" 
                                startIcon={<PlayArrow />}
                                onClick={() => handleComenzar(a.id)}
                                sx={{ bgcolor: '#D2691E', color: 'white', '&:hover': { bgcolor: '#BF360C' } }}
                            >
                                Realizar
                            </Button>
                        </>
                    )}

                    {/* ACCIONES PROFESOR */}
                    {isProfesor && (
                      <>
                        <IconButton 
                            size="small" 
                            onClick={(e) => { e.stopPropagation(); actividadService.editarActividad(claseId, a.id, { isVisible: !a.is_visible }).then(()=>loadAll()).catch(()=>{}); }}
                        >
                            {a.is_visible ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                        <IconButton edge="end" onClick={(e) => { e.stopPropagation(); openEdit(a); }} sx={{ mr: 1 }}>
                          <Edit />
                        </IconButton>
                        <IconButton edge="end" color="error" onClick={(e) => { e.stopPropagation(); setDeleteTargetId(a.id); setOpenDeleteDialog(true); }}>
                          <Delete />
                        </IconButton>
                      </>
                    )}
                  </Box>
                }
              >
                <ListItemButton onClick={() => isProfesor ? router.push(`/actividades/${claseId}/ver/${a.id}`) : handleComenzar(a.id)} sx={{ px: 2, py: 2 }}>
                  <ListItemText 
                    primary={
                        <Typography variant="subtitle1" fontWeight="bold" color="#3E2723">
                            {a.nombre}
                        </Typography>
                    } 
                    secondary={
                        <Box>
                            <Typography variant="body2" color="text.secondary">{a.descripcion}</Typography>
                            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                {a.tipo === 'evaluacion' && <Chip size="small" label={`Evaluación`} color="warning" variant="outlined" />}
                                {!a.is_visible && <Chip size="small" label="Oculta" />}
                            </Box>
                        </Box>
                    } 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* --- DIALOG CREAR / EDITAR --- */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth>
          <DialogTitle>{editingActividadId ? 'Editar Actividad' : 'Crear Actividad'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField fullWidth label="Nombre" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} sx={{ mb: 2, mt: 1 }} />
            <TextField fullWidth label="Descripción" multiline rows={4} value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} sx={{ mb: 2 }} />

            <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
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

            <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
              <InputLabel id="ejercicios-label">Ejercicios (seleccionar)</InputLabel>
              <Select
                labelId="ejercicios-label"
                multiple
                value={form.ejercicioIds}
                onChange={(e) => setForm({...form, ejercicioIds: e.target.value as string[]})}
                renderValue={(selected) => (selected as string[]).map(id => {
                  const found = ejercicios.find(x => x.id === id);
                  return found ? (found.metadata?.title || found.titulo || found.enunciado || id) : id;
                }).join(', ')}
              >
                {ejercicios.map((ej) => (
                  <MenuItem key={ej.id} value={ej.id}>
                    {ej.metadata?.title || ej.titulo || ej.enunciado || ej.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography sx={{ mb: 1 }}>Crear nuevo ejercicio (opcional)</Typography>
            {!editingActividadId && (
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Button size="small" onClick={() => setForm({...form, nuevosEjercicios: [...form.nuevosEjercicios, { tipo: 'abierta', titulo: '', enunciado: '', puntos: 1, opciones: [], metadata: '' }]})} startIcon={<Add />}>Agregar ejercicio</Button>
              </Box>
            )}

            {!editingActividadId && form.nuevosEjercicios.length > 0 && (
              <Box sx={{ mb: 2 }}>
                {form.nuevosEjercicios.map((ne, idx) => (
                  <Box key={idx} sx={{ border: '1px dashed #DDD', p: 2, mb: 2 }}>
                    {/* Renderizado básico de formulario de nuevos ejercicios (simplificado para no extender demasiado, usando tu lógica) */}
                    <TextField fullWidth label={`Título #${idx + 1}`} value={ne.titulo || ''} onChange={(e) => setForm({...form, nuevosEjercicios: form.nuevosEjercicios.map((x, i) => i === idx ? { ...x, titulo: e.target.value } : x) })} sx={{ mb: 1 }} />
                    <TextField fullWidth label="Enunciado" multiline value={ne.enunciado || ''} onChange={(e) => setForm({...form, nuevosEjercicios: form.nuevosEjercicios.map((x,i) => i===idx?{...x, enunciado: e.target.value}:x) })} />
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <Select value={ne.tipo || 'abierta'} onChange={(e) => setForm({...form, nuevosEjercicios: form.nuevosEjercicios.map((x,i) => i===idx?{...x, tipo: e.target.value}:x) })}>
                            <MenuItem value="abierta">Abierta</MenuItem>
                            <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                            <MenuItem value="verdadero-falso">Verdadero/Falso</MenuItem>
                        </Select>
                    </FormControl>
                    {/* Si es MC o VF, mostramos editor de opciones (simplificado aquí) */}
                    {ne.tipo === 'multiple-choice' && <OptionsEditor opciones={ne.opciones || []} onChange={(opts) => setForm({...form, nuevosEjercicios: form.nuevosEjercicios.map((x,i) => i === idx ? {...x, opciones: opts} : x) })} />}
                    <Button color="error" onClick={() => setForm({...form, nuevosEjercicios: form.nuevosEjercicios.filter((_, i) => i !== idx)})}>Eliminar</Button>
                  </Box>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleSubmit} sx={{ background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)' }}>{editingActividadId ? 'Guardar' : 'Crear'}</Button>
          </DialogActions>
        </Dialog>

        {/* --- DIALOG ELIMINAR --- */}
        <Dialog open={openDeleteDialog} onClose={() => { setOpenDeleteDialog(false); setDeleteTargetId(null); }} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            <Typography>¿Estás seguro de eliminar la actividad? Esta acción no se puede deshacer.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpenDeleteDialog(false); setDeleteTargetId(null); }}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={async () => {
                const idToDelete = deleteTargetId;
                setOpenDeleteDialog(false);
                setDeleteTargetId(null);
                if (idToDelete) await handleEliminar(idToDelete);
            }}>Eliminar</Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}