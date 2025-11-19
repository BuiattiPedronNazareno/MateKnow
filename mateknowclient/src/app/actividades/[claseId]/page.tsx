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
} from '@mui/material';
import { ArrowBack, Delete, Add, Edit, Visibility, VisibilityOff } from '@mui/icons-material';
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
            if (e.tipo === 'verdadero-falso') {
              const opts = e.opciones || [];
              if (opts.length !== 2 || !opts.some((o:any) => o.is_correcta) || opts.filter((o:any) => o.is_correcta).length !== 1) {
                setError('Verdadero/Falso requiere 2 opciones y exactamente una marcada como correcta');
                return;
              }
            }
          }
        }

      if (editingActividadId) {
        // The backend's UpdateActividadDto doesn't accept `tipo`, but it DOES accept
        // `nuevosEjercicios` — allow it here so users can quick-add new exercises while editing.
        const allowedKeys = ['nombre', 'descripcion', 'fechaInicio', 'fechaFin', 'isVisible', 'ejercicioIds'];
        const updatePayload: any = {};
        for (const k of allowedKeys) {
          if ((payload as any)[k] !== undefined) updatePayload[k] = (payload as any)[k];
        }
        // Close the dialog immediately to avoid blocking UI while waiting the API
        setOpenDialog(false);
        await actividadService.editarActividad(claseId, editingActividadId, updatePayload as any);
      } else {
        // Close the dialog immediately so user sees response quickly
        setOpenDialog(false);
        await actividadService.crearActividad(claseId, payload as any);
      }
      // already closed right before API call
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
                <ListItem key={a.id} disablePadding secondaryAction={isProfesor ? (
                <>
                  <IconButton edge="end" onClick={(e) => { e.stopPropagation(); openEdit(a); }} sx={{ mr: 1 }}>
                    <Edit />
                  </IconButton>
                  <IconButton edge="end" onClick={(e) => { e.stopPropagation(); setDeleteTargetId(a.id); setOpenDeleteDialog(true); }}>
                    <Delete />
                  </IconButton>
                </>
              ) : null}>
                <ListItemButton onClick={() => router.push(`/actividades/${claseId}/ver/${a.id}`)} sx={{ px: 2 }}>
                  <ListItemText primary={a.nombre} secondary={a.descripcion} sx={!a.is_visible ? { color: 'warning.main' } : {}} />
                </ListItemButton>
                <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                  {a.tipo === 'evaluacion' && <Chip label={`Evaluación ${a.fecha_inicio ? `(${new Date(a.fecha_inicio).toLocaleDateString()})` : ''}`} />}
                  {!a.is_visible && <Chip label="Oculta" color="warning" />}
                    {isProfesor && (
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); actividadService.editarActividad(claseId, a.id, { isVisible: !a.is_visible }).then(()=>loadAll()).catch(()=>{}); }}>
                        {a.is_visible ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    )}
                  {isProfesor && (
                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteTargetId(a.id); setOpenDeleteDialog(true); }}>
                      <Delete />
                    </IconButton>
                  )}
                </Box>
                </ListItem>
            ))}
          </List>
        </Paper>

        {/* Dialog Crear */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth>
          <DialogTitle>Crear Actividad</DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
            <TextField fullWidth label="Nombre" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} sx={{ mb: 2, mt: 1 }} InputProps={{ sx: { paddingTop: '10px' } }} />
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
                sx={{ '& .MuiSelect-select': { display: 'flex', alignItems: 'center', paddingTop: 2 } }}
                MenuProps={{ disablePortal: true, PaperProps: { sx: { '& .MuiMenuItem-root': { alignItems: 'center', py: 1 } } } }}
              >
                {ejercicios.map((ej) => (
                  <MenuItem key={ej.id} value={ej.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{ej.metadata?.title || ej.titulo || ej.enunciado || ej.id}</span>
                      {ej.belongsToHiddenActivity && (
                        <Chip label="Oculta" color="warning" size="small" sx={{ ml: 1 }} aria-label="Ejercicio pertenece a actividad oculta" />
                      )}
                    </Box>
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
              <Typography variant="caption" color="text.secondary">Agrega ejercicios que se crearán y asociarán a la actividad</Typography>
            </Box>

            {!editingActividadId && form.nuevosEjercicios.length > 0 && (
              <Box sx={{ mb: 2 }}>
                {form.nuevosEjercicios.map((ne, idx) => (
                  <Box key={idx} sx={{ border: '1px dashed #DDD', p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
                      <TextField fullWidth label={`Título del ejercicio #${idx + 1}`} value={ne.titulo || ''} onChange={(e) => setForm({...form, nuevosEjercicios: form.nuevosEjercicios.map((x, i) => i === idx ? { ...x, titulo: e.target.value } : x) })} />
                      <Button color="error" onClick={() => setForm({...form, nuevosEjercicios: form.nuevosEjercicios.filter((_, i) => i !== idx)})}>Eliminar</Button>
                    </Box>
                    <TextField fullWidth label="Enunciado" multiline rows={3} value={ne.enunciado || ''} onChange={(e) => setForm({...form, nuevosEjercicios: form.nuevosEjercicios.map((x,i) => i===idx?{...x, enunciado: e.target.value}:x) })} sx={{ mb: 1 }} />
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField type="number" label="Puntos" value={ne.puntos ?? 1} onChange={(e) => setForm({...form, nuevosEjercicios: form.nuevosEjercicios.map((x,i) => i===idx?{...x, puntos: Number(e.target.value) || 1}:x) })} sx={{ width: 120 }} />
                      <FormControl fullWidth>
                        <InputLabel id={`tipo-ej-${idx}`}>Tipo de ejercicio</InputLabel>
                        <Select labelId={`tipo-ej-${idx}`} value={ne.tipo || 'abierta'} label="Tipo de ejercicio" onChange={(e) => setForm({...form, nuevosEjercicios: form.nuevosEjercicios.map((x,i) => i===idx?{...x, tipo: e.target.value as any}:x) })} MenuProps={{ disablePortal: true }}>
                          <MenuItem value="abierta">Abierta</MenuItem>
                          <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                          <MenuItem value="verdadero-falso">Verdadero/Falso</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    {ne.tipo === 'multiple-choice' && (
                      <OptionsEditor opciones={ne.opciones || []} onChange={(opts) => setForm({...form, nuevosEjercicios: form.nuevosEjercicios.map((x,i) => i === idx ? {...x, opciones: opts} : x) })} />
                    )}

                    {ne.tipo === 'verdadero-falso' && (
                      <RadioGroup
                        value={(ne.opciones || []).findIndex((o:any) => o.is_correcta) === 0 ? 'verdadero' : 'falso'}
                        onChange={(e) => {
                          const isTrue = e.target.value === 'verdadero';
                          const nextOpts = [
                            { texto: 'Verdadero', is_correcta: isTrue },
                            { texto: 'Falso', is_correcta: !isTrue },
                          ];
                          setForm({ ...form, nuevosEjercicios: form.nuevosEjercicios.map((x,i) => i === idx ? { ...x, opciones: nextOpts } : x ) });
                        }}
                      >
                        <FormControlLabel value="verdadero" control={<Radio />} label="Verdadero" />
                        <FormControlLabel value="falso" control={<Radio />} label="Falso" />
                      </RadioGroup>
                    )}
                    <TextField fullWidth label="Metadata (JSON opcional)" value={typeof ne.metadata === 'object' ? JSON.stringify(ne.metadata) : (ne.metadata || '')} onChange={(e) => setForm({...form, nuevosEjercicios: form.nuevosEjercicios.map((x,i) => i===idx?{...x, metadata: e.target.value}:x) })} multiline rows={3} sx={{ mb: 2 }} />
                  </Box>
                ))}
              </Box>
            )}
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
        <Dialog open={openDeleteDialog} onClose={() => { setOpenDeleteDialog(false); setDeleteTargetId(null); }} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            <Typography>¿Estás seguro de eliminar la actividad y los registros relacionados? Esta acción no se puede deshacer.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpenDeleteDialog(false); setDeleteTargetId(null); }}>Cancelar</Button>
              <Button color="error" variant="contained" onClick={async () => {
                // Close the dialog immediately so the UI feels responsive
                const idToDelete = deleteTargetId;
                setOpenDeleteDialog(false);
                setDeleteTargetId(null);
                if (!idToDelete) return;
                try {
                  await handleEliminar(idToDelete);
                } catch (err) {
                  // Error is set in handleEliminar
                }
              }}>Eliminar</Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}
