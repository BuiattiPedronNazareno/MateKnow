'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Container, Paper, Typography, Button, CircularProgress, Alert, RadioGroup, FormControlLabel, Radio, TextField, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Chip } from '@mui/material';
import { actividadService } from '@/app/services/actividadService';
import { claseService } from '@/app/services/claseService';

export default function EjecutarActividadPage() {
  const params = useParams();
  const { claseId, actividadId } = params as any;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProfesor, setIsProfesor] = useState(false);
  const [actividad, setActividad] = useState<any>(null);
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [registroId, setRegistroId] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, any>>({});
  const [resultado, setResultado] = useState<any | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    loadPage();
  }, [actividadId]);

  const loadPage = async () => {
    try {
      setLoading(true);
      const c = await claseService.getClaseById(claseId);
      setIsProfesor(c.clase.isProfesor);

      // pedir actividad (puede venir desde endpoint de actividades)
      const all = await actividadService.listarActividades(claseId);
      const found = (all.actividades || []).find((a: any) => a.id === actividadId);
      if (!found) throw new Error('Actividad no encontrada');
      setActividad(found);

      // obtener ejercicios asociados
      setEjercicios(found.ejercicios || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al cargar la actividad');
    } finally {
      setLoading(false);
    }
  };

  const handleIniciar = async () => {
    try {
      const res = await actividadService.iniciarIntento(claseId, actividadId);
      setRegistroId(res.registroId);
      // calcular tiempo restante
      if (res.fechaFin) {
        const fin = new Date(res.fechaFin).getTime();
        const ahora = Date.now();
        setTimeLeft(Math.max(0, Math.floor((fin - ahora) / 1000)));
      }

      // start timer
      startTimer();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al iniciar intento');
    }
  };

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleFinalizar();
      return;
    }
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (!t) return 0;
        if (t <= 1) {
          window.clearInterval(id);
          handleFinalizar();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timeLeft]);

  const startTimer = () => {
    // placeholder: timer managed by useEffect above
  };

  const handleAnswer = (ejercicioId: string, optionId: string) => {
    const next = { ...respuestas, [ejercicioId]: optionId };
    setRespuestas(next);

    // autosave
    if (registroId) {
      actividadService.guardarRespuestas(claseId, actividadId, { registroId, respuestas: { [ejercicioId]: optionId } }).catch((e) => console.error('autosave failed', e));
    } else {
      // guardar en localStorage por si acaso
      localStorage.setItem(`autosave_${actividadId}`, JSON.stringify(next));
    }
  };

  const handleFinalizar = async () => {
    try {
      if (!registroId) {
        setError('No hay registro activo para finalizar');
        return;
      }
      const res = await actividadService.finalizarIntento(claseId, actividadId, { registroId });
      // Show results modal with breakdown
      setResultado(res);
      // stop timer
      setTimeLeft(0);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al finalizar intento');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <>
      <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{actividad?.nombre}</Typography>
            {timeLeft !== null && <Typography>Tiempo restante: {timeLeft}s</Typography>}
          </Box>
          {!actividad?.is_visible && (
            <Chip label="Oculta" color="warning" sx={{ mb: 2 }} />
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {!registroId && (
            <Button variant="contained" onClick={handleIniciar} sx={{ background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)' }}>
              Iniciar Evaluación
            </Button>
          )}

          {registroId && (
            <Box sx={{ mt: 3 }}>
              {ejercicios.map((ej) => (
                <Paper key={ej.id} sx={{ p: 2, mb: 2, ...(actividad?.is_visible ? {} : { backgroundColor: 'rgba(255,152,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }) }}>
                  <Typography sx={{ mb: 1 }}>{ej.titulo || ej.enunciado}</Typography>
                  {ej.tipo?.key === 'abierta' ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={respuestas[ej.id] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRespuestas(prev => ({ ...prev, [ej.id]: val }));
                        if (registroId) {
                          actividadService.guardarRespuestas(claseId, actividadId, { registroId, respuestas: { [ej.id]: val } }).catch(() => {});
                        }
                      }}
                    />
                  ) : (
                    <RadioGroup value={respuestas[ej.id] || ''} onChange={(e) => handleAnswer(ej.id, e.target.value)}>
                      {(ej.opciones || []).map((op: any) => (
                        <FormControlLabel key={op.id} value={op.id} control={<Radio />} label={op.texto || op.contenido || op.text} />
                      ))}
                    </RadioGroup>
                  )}
                </Paper>
              ))}

                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button variant="outlined" onClick={() => { actividadService.guardarRespuestas(claseId, actividadId, { registroId: registroId!, respuestas }).then(()=>alert('Guardado')).catch(()=>alert('Error')) }}>Guardar</Button>
                <Button variant="contained" color="primary" onClick={handleFinalizar}>Finalizar Evaluación</Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
      </Box>
      {/* Results dialog */}
    <Dialog open={!!resultado} onClose={() => setResultado(null)} maxWidth="sm" fullWidth>
      <DialogTitle>Resultados</DialogTitle>
      <DialogContent>
        <Typography variant="h6">Puntaje final: {resultado?.puntaje ?? ''}</Typography>
        <List>
          {(resultado?.detalles || []).map((det: any) => {
            const ejercicio = ejercicios.find((e) => e.id === det.ejercicioId);
            const givenOpt = ejercicio?.opciones?.find((o: any) => o.id === det.givenOptionId);
            const correctOpt = ejercicio?.opciones?.find((o: any) => o.id === det.correctOptionId);
            return (
              <ListItem key={det.ejercicioId} sx={{ bgcolor: det.isCorrect ? 'rgba(76,175,80,0.08)' : 'rgba(244,67,54,0.06)', mb: 1, borderRadius: 1 }}>
                <ListItemText primary={ejercicio?.titulo || ejercicio?.enunciado || det.ejercicioId} secondary={
                  <>
                    <div>Tu respuesta: {givenOpt ? givenOpt.texto || givenOpt.contenido || givenOpt.text : 'No respondida'}</div>
                    <div>Respuesta correcta: {correctOpt ? correctOpt.texto || correctOpt.contenido || correctOpt.text : 'N/A'}</div>
                    <div>Estado: {det.isCorrect ? 'Correcto' : 'Incorrecto'}</div>
                  </>
                } />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setResultado(null); router.push(`/clases/${claseId}`); }}>Cerrar y volver</Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
