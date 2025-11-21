'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Container, Paper, Typography, List, ListItemButton, ListItemText,
  Divider, Card, CardContent, TextField, Button, Chip, Avatar, CircularProgress,
  ListItemAvatar, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { ArrowBack, CheckCircle, Pending } from '@mui/icons-material';
import { actividadService } from '@/app/services/actividadService';

export default function CorregirActividadPage() {
  const params = useParams();
  const claseId = params.claseId as string;
  const actividadId = params.actividadId as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [actividad, setActividad] = useState<any>(null);
  const [intentos, setIntentos] = useState<any[]>([]);
  const [selectedIntento, setSelectedIntento] = useState<any>(null);
  const [puntajesManuales, setPuntajesManuales] = useState<{[key: string]: string}>({});

  // Estado para el Modal de Feedback
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: '',
    message: '',
    severity: 'info' as 'success' | 'error' | 'info'
  });

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const actData = await actividadService.getActividadById(claseId, actividadId);
        setActividad(actData.actividad);

        const intentosData = await actividadService.getIntentosPorActividad(claseId, actividadId);
        setIntentos(intentosData.intentos || []);
      } catch (err) {
        console.error(err);
        showFeedback('Error', 'No se pudieron cargar los datos.', 'error');
      } finally {
        setLoading(false);
      }
    };
    if (claseId && actividadId) loadData();
  }, [claseId, actividadId]);

  const showFeedback = (title: string, message: string, severity: 'success' | 'error' | 'info' = 'info') => {
    setFeedbackModal({ open: true, title, message, severity });
  };

  const handleCloseFeedback = () => {
    setFeedbackModal({ ...feedbackModal, open: false });
  };

  const handleSelectIntento = (intento: any) => {
    setSelectedIntento(intento);
    setPuntajesManuales({});
  };

  const handleCorregir = async (ejercicioId: string, puntajeMax: number) => {
    const val = puntajesManuales[ejercicioId];
    if (!val || isNaN(Number(val))) {
      showFeedback('Valor inválido', 'Por favor ingresa un puntaje numérico válido.', 'error');
      return;
    }
    
    const puntaje = Number(val);
    if (puntaje < 0 || puntaje > puntajeMax) {
      showFeedback('Puntaje fuera de rango', `El puntaje debe estar entre 0 y ${puntajeMax}.`, 'error');
      return;
    }

    try {
      await actividadService.corregirRespuesta(claseId, actividadId, selectedIntento.id, ejercicioId, puntaje);
      
      // Actualizar localmente
      const updatedRespuestas = selectedIntento.respuestas.map((r: any) => {
        if (r.ejercicioId === ejercicioId) return { ...r, puntajeManual: puntaje, corregido: true };
        return r;
      });
      
      const updatedIntento = { ...selectedIntento, respuestas: updatedRespuestas };
      setSelectedIntento(updatedIntento);
      setIntentos(intentos.map(i => i.id === updatedIntento.id ? updatedIntento : i));
      
      showFeedback('Guardado', 'La corrección se ha guardado exitosamente.', 'success');
    } catch (err) {
      console.error(err);
      showFeedback('Error', 'Hubo un problema al guardar la corrección.', 'error');
    }
  };

  if (loading) return <Box sx={{ p: 5, display: 'flex', justifyContent: 'center', bgcolor: '#F5DEB3', minHeight: '100vh' }}><CircularProgress sx={{ color: '#8B4513' }} /></Box>;

  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', pb: 5 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 0, bgcolor: '#FFF8E1' }}>
        <Container maxWidth="xl">
          <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 1, color: '#5D4037' }}>Volver</Button>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#3E2723' }}>Corregir: {actividad?.nombre}</Typography>
          <Typography color="text.secondary">{intentos.length} entregas recibidas</Typography>
        </Container>
      </Paper>

      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          
          {/* COLUMNA IZQUIERDA: LISTA DE ALUMNOS */}
          <Box sx={{ width: { xs: '100%', md: '25%' }, minWidth: { md: 300 } }}>
            <Paper sx={{ height: 'calc(100vh - 200px)', overflowY: 'auto', bgcolor: '#FFF' }}>
              <List>
                {intentos.map((intento) => (
                  <ListItemButton 
                    key={intento.id} 
                    selected={selectedIntento?.id === intento.id}
                    onClick={() => handleSelectIntento(intento)}
                    divider
                    sx={{ 
                      '&.Mui-selected': { bgcolor: '#FFE0B2', '&:hover': { bgcolor: '#FFCC80' } },
                      '&:hover': { bgcolor: '#FFF3E0' }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#8B4513' }}>{intento.usuario?.nombre?.[0] || 'A'}</Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      // CORRECCIÓN 1: Usamos component="div" para evitar nesting inválido en primary
                      primary={
                        <Typography component="div" sx={{ color: '#3E2723', fontWeight: 500 }}>
                          {intento.usuario?.nombre || 'Desconocido'}
                        </Typography>
                      }
                      // CORRECCIÓN 2: Cambiamos el contenedor secundario a div para permitir el Chip
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <>
                          <Typography variant="caption" display="block" color="text.secondary">
                             {new Date(intento.created_at).toLocaleDateString()}
                          </Typography>
                          <Chip 
                            label={`${intento.puntaje || 0} pts`} 
                            size="small" 
                            sx={{ mt: 0.5, borderColor: intento.puntaje > 0 ? '#2E7D32' : '#999', color: intento.puntaje > 0 ? '#2E7D32' : '#666' }}
                            variant="outlined"
                          />
                        </>
                      }
                    />
                  </ListItemButton>
                ))}
                {intentos.length === 0 && (
                  <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>No hay entregas aún.</Typography>
                )}
              </List>
            </Paper>
          </Box>

          {/* COLUMNA DERECHA: EXAMEN DEL ALUMNO */}
          <Box sx={{ width: { xs: '100%', md: '75%' }, flexGrow: 1 }}>
            {selectedIntento ? (
              <Box>
                 <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#FFF' }}>
                    <Typography variant="h6" sx={{ color: '#3E2723' }}>
                      Revisando a: <b>{selectedIntento.usuario?.nombre}</b>
                    </Typography>
                    <Chip label={`Puntaje Total: ${selectedIntento.puntaje}`} sx={{ bgcolor: '#8B4513', color: 'white', fontWeight: 'bold' }} />
                 </Paper>

                {actividad.ejercicios?.map((ej: any, index: number) => {
                   const resp = selectedIntento.respuestas?.find((r: any) => r.ejercicioId === ej.id);
                   
                   // 1. OBTENER RESPUESTA RAW
                   let respuestaTexto = resp?.respuesta;

                   // 2. FIX UUID: Si es Multiple Choice, buscamos el texto de la opción correspondiente
                   if ((ej.tipo === 'multiple-choice' || ej.tipo === 'true_false') && ej.opciones) {
                      const opcionEncontrada = ej.opciones.find((op: any) => String(op.id) === String(respuestaTexto));
                      if (opcionEncontrada) {
                          // Mostramos el texto (ej: "Verdadero") en lugar del UUID
                          respuestaTexto = opcionEncontrada.texto; 
                      }
                   }

                   const puntajeActual = resp?.puntajeManual ?? (resp?.corregido ? resp?.puntajeManual : (ej.tipo !== 'abierta' ? 'Auto' : 0));

                   return (
                     <Card key={ej.id} sx={{ mb: 2, borderLeft: ej.tipo === 'abierta' ? '6px solid #FF9800' : '6px solid #4CAF50' }}>
                       <CardContent>
                         <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                           <Typography variant="subtitle2" sx={{ color: '#8B4513', fontWeight: 'bold' }}>Pregunta {index + 1} ({ej.tipo})</Typography>
                           <Chip label={`${ej.puntos} pts máx`} size="small" variant="outlined" />
                         </Box>
                         
                         <Typography variant="h6" gutterBottom sx={{ color: '#3E2723' }}>{ej.enunciado}</Typography>
                         
                         {/* Respuesta del Alumno (AHORA TRADUCIDA) */}
                         <Box sx={{ bgcolor: '#FAFAFA', p: 2, borderRadius: 1, mb: 2, border: '1px solid #EEE' }}>
                           <Typography variant="caption" color="text.secondary">Respuesta del alumno:</Typography>
                           <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap', color: '#000', fontWeight: 500 }}>
                             {respuestaTexto ? String(respuestaTexto) : <span style={{fontStyle:'italic', color:'#999'}}>Sin respuesta</span>}
                           </Typography>
                         </Box>

                         <Divider sx={{ my: 2 }} />
                         
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#FFF8E1', p: 2, borderRadius: 2 }}>
                            {/* ... El resto del bloque de calificación sigue igual ... */}
                            <Typography variant="body2" fontWeight="bold" sx={{ color: '#5D4037' }}>Calificación:</Typography>
                            {ej.tipo === 'abierta' ? (
                              <>
                                <TextField 
                                  type="number" 
                                  size="small" 
                                  label="Puntos" 
                                  placeholder={String(ej.puntos)}
                                  sx={{ width: 100, bgcolor: 'white' }}
                                  value={puntajesManuales[ej.id] !== undefined ? puntajesManuales[ej.id] : (resp?.puntajeManual ?? '')}
                                  onChange={(e) => setPuntajesManuales({...puntajesManuales, [ej.id]: e.target.value})}
                                />
                                <Button 
                                  variant="contained" 
                                  size="small"
                                  onClick={() => handleCorregir(ej.id, ej.puntos)}
                                  sx={{ bgcolor: '#8B4513', '&:hover': { bgcolor: '#654321' } }}
                                >
                                  Guardar
                                </Button>
                                {resp?.corregido && <Chip label="Corregido" color="success" size="small" icon={<CheckCircle />} />}
                              </>
                            ) : (
                              <Typography sx={{ color: '#333' }}>
                                Automática: <b>{puntajeActual === 'Auto' ? 'Calculada por sistema' : puntajeActual}</b>
                              </Typography>
                            )}
                         </Box>

                       </CardContent>
                     </Card>
                   );
                 })}
              </Box>
            ) : (
              <Paper sx={{ p: 5, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Pending sx={{ fontSize: 60, color: '#D7CCC8', mb: 2 }} />
                <Typography color="text.secondary">Selecciona un alumno de la lista para comenzar a corregir.</Typography>
              </Paper>
            )}
          </Box>

        </Box>
      </Container>

      {/* Modal de Feedback */}
      <Dialog 
        open={feedbackModal.open} 
        onClose={handleCloseFeedback}
        disableScrollLock={true} // Evita saltos de scroll
      >
        <DialogTitle sx={{ color: feedbackModal.severity === 'error' ? '#D32F2F' : '#2E7D32' }}>
          {feedbackModal.title}
        </DialogTitle>
        <DialogContent>
          <Typography>{feedbackModal.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFeedback} sx={{ color: '#8B4513' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}