'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  Box, Container, Paper, Typography, Button, CircularProgress,
  LinearProgress, Radio, RadioGroup, FormControlLabel, FormControl,
  TextField, Alert, Card, CardContent, Divider, Chip, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  Timer, CheckCircle, NavigateNext, NavigateBefore, Coffee, 
  Cancel, Check, ArrowBack, Visibility, Quiz
} from '@mui/icons-material';
import { actividadService, Intento } from '@/app/services/actividadService';
import { MathJax, MathJaxContext } from "better-react-mathjax";

// Componente Timer con estilo Mate
const ExamTimer = ({ fechaFin, onExpire }: { fechaFin: string, onExpire: () => void }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (!fechaFin) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(fechaFin).getTime();
      
      if (isNaN(end)) {
        clearInterval(interval);
        return;
      }

      const distance = end - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft('Tiempo agotado');
        onExpire();
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        if (distance < 1000 * 60 * 5) setUrgent(true); 
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fechaFin, onExpire]);

  if (!fechaFin) return null;

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, 
        bgcolor: urgent ? '#ffebee' : 'rgba(255,255,255,0.2)', 
        color: urgent ? 'error.main' : '#FFF',
        borderRadius: 2,
        border: urgent ? '1px solid red' : '1px solid rgba(255,255,255,0.3)'
      }}
    >
      <Timer fontSize="small" />
      <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem' }}>
        {timeLeft}
      </Typography>
    </Paper>
  );
};

export default function RealizarActividadPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const initialized = useRef(false);

  const rawClaseId = params?.claseId;
  const claseId = (Array.isArray(rawClaseId) ? rawClaseId[0] : rawClaseId) as string;
  const rawActividadId = params?.actividadId;
  const actividadId = (Array.isArray(rawActividadId) ? rawActividadId[0] : rawActividadId) as string;

  // PARÁMETROS DE URL
  const isReviewModeParam = searchParams.get('mode') === 'revision';
  const intentoIdParam = searchParams.get('intentoId'); // ID específico del intento a revisar

  const [loading, setLoading] = useState(true);
  const [actividad, setActividad] = useState<any>(null);
  const [intento, setIntento] = useState<Intento | null>(null);
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [respuestasLocales, setRespuestasLocales] = useState<{[key: string]: any}>({});
  
  // Estados de flujo
  const [activeStep, setActiveStep] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openFinishDialog, setOpenFinishDialog] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // CONFIGURACIÓN DE MATHJAX
  const mathjaxConfig = {
    loader: { load: ["input/tex", "output/chtml"] },
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"]],
    },
    // AGREGAR ESTA LÍNEA para asegurar la carga:
    src: "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
  };

  useEffect(() => {
    // Evitar que corra si no hay IDs o si ya se inicializó
    if (!claseId || !actividadId || initialized.current) return;
    
    // Marcar como inicializado inmediatamente
    initialized.current = true;
    
    initEvaluation();
    
    // Cleanup opcional: si desmonta, permitir reiniciar (útil en dev)
    return () => { initialized.current = false; };
  }, [actividadId, claseId, isReviewModeParam, intentoIdParam]);


  const initEvaluation = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. MODO REVISIÓN (Historial o URL directa)
      if (isReviewModeParam) {
         await cargarModoRevision(intentoIdParam || undefined);
         return;
      }

      // 2. MODO REALIZAR: Intentar iniciar o retomar intento
      const intentoRes = await actividadService.iniciarIntento(claseId, actividadId);
      
      if (intentoRes.intento.estado === 'finished') {
        // Si el backend dice que ya terminó (ej. evaluación única), forzamos revisión
        await cargarModoRevision();
      } else {
        // MODO EXAMEN EN PROGRESO
        // Obtenemos detalle SIN respuestas correctas
        const detalleRes = await actividadService.getActividadById(claseId, actividadId);
        setActividad(detalleRes.actividad);
        setEjercicios(detalleRes.actividad.ejercicios || []);
        setIntento(intentoRes.intento);
        
        // Cargar respuestas previas si existen
        const map: any = {};
        (intentoRes.intento.respuestas || []).forEach((r: any) => { map[r.ejercicioId] = r.respuesta; });
        setRespuestasLocales(map);
      }

    } catch (err: any) {
      console.error("Error init:", err);
      setError(err.response?.data?.message || err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const cargarModoRevision = async (targetIntentoId?: string) => {
    setIsReviewMode(true);
    // Pasamos targetIntentoId al servicio para obtener ese intento específico
    const revisionRes = await actividadService.getRevision(claseId, actividadId, targetIntentoId);
    
    setActividad(revisionRes.actividad);
    setEjercicios(revisionRes.actividad.ejercicios || []);
    setIntento(revisionRes.intento);
    setScore(revisionRes.intento.puntaje || 0);

    // Mapear respuestas para la UI (Solo lectura)
    const map: any = {};
    (revisionRes.intento.respuestas || []).forEach((r: any) => { map[r.ejercicioId] = r.respuesta; });
    setRespuestasLocales(map);
  };

  const handleAnswerChange = (ejercicioId: string, valor: any) => {
    if (isReviewMode || finished) return; // Bloquear cambios en revisión

    setRespuestasLocales(prev => ({ ...prev, [ejercicioId]: valor }));
    setSaving(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      if (intento) {
        try {
          await actividadService.guardarRespuesta(claseId, intento.id, ejercicioId, valor);
        } catch (err) {
          console.error("Error auto-saving", err);
        } finally {
          setSaving(false);
        }
      }
    }, 1000);
  };

  const handleFinalizar = () => {
    if (!intento) return;
    setOpenFinishDialog(true);
  };

  const handleConfirmFinalizar = async () => {
    setOpenFinishDialog(false);
    if (!intento) return;

    try {
      setLoading(true);
      
      // Enviar respuestas finales
      const respuestasArray = Object.entries(respuestasLocales).map(([k, v]) => ({
        ejercicioId: k,
        respuesta: v
      }));

      const payload = { respuestas: respuestasArray };
      const res = await actividadService.finalizarIntento(claseId, intento.id, payload);

      // Actualizar estado local para mostrar éxito sin recargar
      setScore(res.puntaje);
      setFinished(true);

    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al finalizar');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeExpire = () => {
    setOpenFinishDialog(false);
    alert("¡Tiempo terminado! Entregando el mate...");
    
    if (intento) {
        setLoading(true);
        actividadService.finalizarIntento(claseId, intento.id)
            .then(res => {
                setScore(res.puntaje);
                setFinished(true);
            })
            .catch(err => {
                alert(err.response?.data?.message || 'Error al finalizar por tiempo');
            })
            .finally(() => setLoading(false));
    }
  };

  const handleGoToReview = async () => {
    setLoading(true);
    try {
        // Al ir a revisión desde la pantalla de éxito, cargamos el último intento (el recién hecho)
        await cargarModoRevision();
        setFinished(false); // Quitamos pantalla de éxito para mostrar la revisión
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  // --- RENDERERS ---

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#F5DEB3' }}>
        <CircularProgress size={60} sx={{ color: '#8B4513', mb: 2 }} />
        <Typography sx={{ color: '#5D4037', fontWeight: 600 }}>Preparando el agua...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F5DEB3', pt: 8, px: 2 }}>
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2, bgcolor: '#FFF' }}>
            <Coffee sx={{ fontSize: 60, color: '#D32F2F', mb: 2 }} />
            <Typography variant="h5" color="error" gutterBottom fontWeight="bold">
              Ups, el agua se enfrió
            </Typography>
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
            <Button variant="contained" onClick={() => router.back()} sx={{ bgcolor: '#8B4513' }}>
              Volver a la clase
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  // --------------------------------------------------------------------------
  // VISTA: RESULTADO INMEDIATO (Recién terminado)
  // --------------------------------------------------------------------------
  if (finished) {
    const totalPuntos = ejercicios.reduce((acc, e) => acc + (Number(e.puntos) || 0), 0);

    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F5DEB3', pt: 8 }}>
        <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
          <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 8px 24px rgba(139,69,19,0.2)' }}>
            <CheckCircle sx={{ fontSize: 80, color: '#388E3C', mb: 2 }} />
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#3E2723' }}>
              ¡Examen Entregado!
            </Typography>
            <Typography color="text.secondary" paragraph>
              Tus respuestas quedaron guardadas correctamente.
            </Typography>
            
            <Box sx={{ my: 4, p: 3, bgcolor: '#FFF8E1', borderRadius: 2, border: '2px dashed #D2691E' }}>
              <Typography variant="subtitle1" sx={{ color: '#8B4513', fontWeight: 600 }} gutterBottom>
                TU CALIFICACIÓN
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#D2691E' }}>
                {score} / {totalPuntos}
              </Typography>
              <Typography variant="caption" sx={{ color: '#5D4037' }}>Puntos obtenidos</Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<Visibility />}
                onClick={handleGoToReview} 
                size="large"
                sx={{ bgcolor: '#D2691E', '&:hover': { bgcolor: '#E65100' } }}
              >
                Revisar Respuestas
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => router.push(`/clases/${claseId}`)}
                sx={{ color: '#8B4513', borderColor: '#8B4513' }}
              >
                Volver a la clase
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  // --------------------------------------------------------------------------
  // VISTA: MODO REVISIÓN 
  // --------------------------------------------------------------------------
  if (isReviewMode) {
    const totalPuntos = ejercicios.reduce((acc, e) => acc + (Number(e.puntos) || 0), 0);
    
    return (
      <MathJaxContext version={3} config={mathjaxConfig}>
        <Box sx={{ minHeight: '100vh', bgcolor: '#F5DEB3', pb: 8 }}>
          {/* Header Revisión */}
          <Box sx={{ bgcolor: '#3E2723', color: 'white', py: 3, px: 2, textAlign: 'center', mb: 4, boxShadow: 3 }}>
            <Typography variant="h5" fontWeight="bold">Revisión de Examen</Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>{actividad?.nombre}</Typography>
            
            {intento && (
               <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.8 }}>
                 Realizado el: {new Date((intento as any).created_at || intento.started_at).toLocaleString()}
               </Typography>
            )}

            <Chip 
              label={`Calificación: ${score} / ${totalPuntos}`} 
              sx={{ mt: 2, bgcolor: '#FFF', color: '#3E2723', fontWeight: 'bold', fontSize: '1.1rem', py: 2 }} 
            />
          </Box>

          <Container maxWidth="md">
            <Button startIcon={<ArrowBack />} onClick={() => router.push(`/clases/${claseId}`)} sx={{ mb: 2, color: '#3E2723' }}>
              Volver a la clase
            </Button>

            {ejercicios.map((ej, idx) => {
              const respObjeto = intento?.respuestas?.find((r: any) => 
                String(r.ejercicioId).trim() === String(ej.id).trim()
              );
              const respuestaUsuario = respObjeto?.respuesta; 
              
              let esCorrecto = false;
              let puntosObtenidos = 0;
              let fueCorregido = !!respObjeto?.corregido;

              // DETECCIÓN DE TIPO: Abierta o Latex sin opciones se tratan igual
              const isTipoAbierta = ej.tipo === 'abierta' || (ej.tipo === 'latex' && (!ej.opciones || ej.opciones.length === 0));

              // 2. LÓGICA DE CORRECCIÓN
              if (isTipoAbierta) {
                 if (fueCorregido && respObjeto.puntajeManual !== undefined) {
                   puntosObtenidos = Number(respObjeto.puntajeManual);
                   esCorrecto = puntosObtenidos > 0;
                 } else {
                   puntosObtenidos = 0;
                   esCorrecto = false; 
                 }
              } else {
                // LÓGICA AUTOMÁTICA
                const opcionCorrecta = ej.opciones?.find((o: any) => o.is_correcta);
                const idUsuario = String(respuestaUsuario || '').trim();
                const idCorrecta = String(opcionCorrecta?.id || '').trim();

                if (idCorrecta && idUsuario === idCorrecta) {
                  esCorrecto = true;
                  puntosObtenidos = Number(ej.puntos);
                }
              }

              // Determinar color del borde
              let borderColor = esCorrecto ? '6px solid #2E7D32' : '6px solid #D32F2F';
              if (isTipoAbierta && !fueCorregido) {
                  borderColor = '6px solid #ED6C02'; 
              }

              return (
                <Card key={ej.id} sx={{ mb: 3, borderRadius: 2, borderLeft: borderColor }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Pregunta {idx + 1}</Typography>
                      
                      <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="subtitle2" fontWeight="bold" color={esCorrecto ? 'success.main' : (isTipoAbierta && !fueCorregido ? 'warning.main' : 'error.main')}>
                              {puntosObtenidos} / {ej.puntos} puntos
                          </Typography>

                          {fueCorregido && (
                              <Typography variant="caption" display="block" sx={{ color: '#1976D2', fontWeight: 'bold', mt: 0.5 }}>
                                  Corregido
                              </Typography>
                          )}
                      </Box>
                    </Box>

                    {/* ENUNCIADO CON LATEX */}
                    <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 500 }} component="div">
                      <MathJax dynamic>{ej.enunciado}</MathJax>
                    </Typography>

                    {/* OPCIONES RENDERIZADAS (Multiple Choice / True False / Latex con opciones) */}
                    {!isTipoAbierta && ej.opciones && (
                      <Box>
                        {ej.opciones.map((op: any) => {
                          const opId = String(op.id).trim();
                          const userResId = String(respuestaUsuario || '').trim();
                          
                          const isSelected = userResId === opId;
                          const isCorrect = op.is_correcta;
                          
                          let bgcolor = '#FAFAFA';
                          let borderColorOp = '#e0e0e0';
                          let icon = <Radio disabled checked={isSelected} />;
                          
                          if (isCorrect) {
                            bgcolor = '#E8F5E9'; 
                            borderColorOp = '#2E7D32';
                            icon = isSelected ? <CheckCircle color="success" /> : <Check color="success" />;
                          } else if (isSelected && !isCorrect) {
                            bgcolor = '#FFEBEE'; 
                            borderColorOp = '#D32F2F';
                            icon = <Cancel color="error" />;
                          }

                          return (
                            <Paper 
                              key={op.id} 
                              variant="outlined" 
                              sx={{ 
                                display: 'flex', alignItems: 'center', p: 1.5, mb: 1,
                                bgcolor, borderColor: borderColorOp, borderWidth: (isSelected || isCorrect) ? 2 : 1
                              }}
                            >
                              <Box sx={{ mr: 1, display: 'flex' }}>{icon}</Box>
                              {/* OPCIÓN CON LATEX */}
                              <Typography sx={{ flex: 1, fontWeight: isCorrect ? 600 : 400 }} component="div">
                                <MathJax inline>{op.texto}</MathJax>
                              </Typography>
                              
                              {isCorrect && <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold', ml: 1 }}>Correcta</Typography>}
                              {isSelected && !isCorrect && <Typography variant="caption" color="error.main" sx={{ fontWeight: 'bold', ml: 1 }}>Tu respuesta</Typography>}
                            </Paper>
                          );
                        })}
                      </Box>
                    )}

                    {/* RESPUESTA ABIERTA (O Latex sin opciones) */}
                    {isTipoAbierta && (
                      <Box sx={{ bgcolor: '#F5F5F5', p: 2, borderRadius: 1, mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">Tu respuesta:</Typography>
                        <Typography sx={{ fontStyle: 'italic', mt: 1 }}>{respuestaUsuario || '(Sin respuesta)'}</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Container>
        </Box>
      </MathJaxContext>
    );
  }

  // --------------------------------------------------------------------------
  // VISTA: MODO EXAMEN (Wizard)
  // --------------------------------------------------------------------------
  if (!actividad || ejercicios.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F5DEB3', pt: 8, px: 2 }}>
        <Container maxWidth="sm">
          <Paper 
            sx={{ 
              p: 5, 
              textAlign: 'center', 
              borderRadius: 4, 
              bgcolor: '#FFF',
              boxShadow: '0 8px 32px rgba(139,69,19,0.15)',
              border: '1px dashed #D2691E'
            }}
          >
            <Quiz sx={{ fontSize: 80, color: '#D2691E', mb: 3, opacity: 0.8 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: '#3E2723' }}>
              Aún no hay ejercicios
            </Typography>
            <Typography color="text.secondary" paragraph sx={{ mb: 4, lineHeight: 1.6 }}>
              Parece que el profesor está preparando el material para esta actividad.<br/>
              Tomate unos mates 🧉 y vuelve a intentar más tarde.
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => router.back()} 
              size="large"
              startIcon={<ArrowBack />}
              sx={{ 
                bgcolor: '#8B4513', 
                borderRadius: 2,
                px: 4,
                '&:hover': { bgcolor: '#654321' } 
              }}
            >
              Volver a la clase
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }
  
  const currentEjercicio = ejercicios[activeStep];
  const progress = ((activeStep + 1) / ejercicios.length) * 100;
  const isMultipleChoice = currentEjercicio.tipo === 'multiple-choice' || currentEjercicio.tipo === 'latex';
  const isTrueFalse = currentEjercicio.tipo === 'true_false'; 
  const isAbierta = currentEjercicio.tipo === 'abierta'

  return (
    <MathJaxContext version={3} config={mathjaxConfig}>
      <Box sx={{ minHeight: '100vh', bgcolor: '#F5DEB3', pb: 8 }}>
        <Box sx={{ 
          position: 'sticky', top: 0, zIndex: 1100, 
          background: 'linear-gradient(90deg, #8B4513 0%, #654321 100%)', 
          color: 'white', px: 3, py: 2,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>{actividad.nombre}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>Pregunta {activeStep + 1} de {ejercicios.length}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {saving && <CircularProgress size={20} sx={{ color: '#F5DEB3' }} />}
            
            {actividad.tipo === 'evaluacion' && actividad.fecha_fin && (
              <ExamTimer fechaFin={actividad.fecha_fin} onExpire={handleTimeExpire} />
            )}
          </Box>
        </Box>

        <Container maxWidth="md" sx={{ mt: 5 }}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 10, borderRadius: 5, mb: 4, bgcolor: 'rgba(139,69,19,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#D2691E' } }} 
          />

          <Card sx={{ minHeight: 450, display: 'flex', flexDirection: 'column', p: 2, boxShadow: '0 8px 24px rgba(62,39,35,0.15)', borderRadius: 3 }}>
            <CardContent sx={{ flex: 1, p: 3 }}>
              {/* Cabecera del Ejercicio */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                 <Chip label={`Ejercicio ${activeStep + 1}`} sx={{ bgcolor: '#8B4513', color: 'white', fontWeight: 600 }} />
                 <Chip label={`${currentEjercicio.puntos} pts`} variant="outlined" sx={{ borderColor: '#D2691E', color: '#D2691E', fontWeight: 600 }} />
              </Box>
              
              {/* ENUNCIADO CON SOPORTE LATEX */}
              <Typography variant="h5" gutterBottom sx={{ mb: 4, fontWeight: 500, color: '#3E2723' }} component="div">
                <MathJax dynamic>{currentEjercicio.enunciado}</MathJax>
              </Typography>
              
              <Divider sx={{ mb: 4, borderColor: 'rgba(139,69,19,0.1)' }} />

              <Box>
                {/* OPCIÓN 1: MULTIPLE CHOICE / TRUE FALSE / LATEX CON OPCIONES */}
                {(isMultipleChoice || isTrueFalse) && (
                  <FormControl component="fieldset" sx={{ width: '100%' }}>
                    <RadioGroup
                      value={respuestasLocales[currentEjercicio.id] || ''}
                      onChange={(e) => handleAnswerChange(currentEjercicio.id, e.target.value)}
                    >
                      {(currentEjercicio.opciones || []).map((op: any) => {
                        const isSelected = respuestasLocales[currentEjercicio.id] === op.id;
                        return (
                          <Paper 
                            key={op.id} 
                            variant="outlined" 
                            component={Button} 
                            onClick={() => handleAnswerChange(currentEjercicio.id, op.id)}
                            sx={{ 
                               mb: 2, p: 1.5, px: 2, borderRadius: 2, textAlign: 'left', textTransform: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                               borderColor: isSelected ? '#D2691E' : '#e0e0e0', borderWidth: isSelected ? 2 : 1,
                               bgcolor: isSelected ? '#FFF3E0' : '#FAFAFA', color: isSelected ? '#D2691E' : '#5D4037',
                               '&:hover': { bgcolor: isSelected ? '#FFE0B2' : '#F5F5F5', borderColor: '#D2691E' }
                            }}
                          >
                            <Radio checked={isSelected} sx={{ color: '#8B4513', '&.Mui-checked': { color: '#D2691E' }, mr: 2 }} />
                            
                            {/* TEXTO DE LA OPCIÓN CON SOPORTE LATEX */}
                            <Box sx={{ width: '100%' }}>
                               <Typography variant="body1" fontWeight={isSelected ? 600 : 400} component="div">
                                  <MathJax inline dynamic>{op.texto}</MathJax>
                               </Typography>
                            </Box>

                          </Paper>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                )}

                {/* OPCIÓN 2: PREGUNTA ABIERTA / LATEX SIN OPCIONES */}
                {isAbierta && (
                  <TextField
                    fullWidth multiline rows={8} placeholder="Escribe tu respuesta detallada aquí..."
                    value={respuestasLocales[currentEjercicio.id] || ''}
                    onChange={(e) => handleAnswerChange(currentEjercicio.id, e.target.value)}
                    variant="outlined"
                    sx={{ bgcolor: '#FAFAFA', '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: '#8B4513' } } }}
                  />
                )}
                
                {/* ALERTA DE FALLBACK */}
                {!isMultipleChoice && !isTrueFalse && !isAbierta && (
                  <Alert severity="warning">Tipo de ejercicio desconocido: {currentEjercicio.tipo}</Alert>
                )}
              </Box>
            </CardContent>

            {/* BOTONES DE NAVEGACIÓN */}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button startIcon={<NavigateBefore />} disabled={activeStep === 0} onClick={() => setActiveStep(prev => prev - 1)} size="large" sx={{ color: '#5D4037' }}>Anterior</Button>
              {activeStep === ejercicios.length - 1 ? (
                <Button variant="contained" endIcon={<CheckCircle />} onClick={handleFinalizar} size="large" sx={{ bgcolor: '#D2691E', fontWeight: 'bold', px: 4, '&:hover': { bgcolor: '#BF360C' } }}>Finalizar</Button>
              ) : (
                <Button variant="contained" endIcon={<NavigateNext />} onClick={() => setActiveStep(prev => prev + 1)} size="large" sx={{ bgcolor: '#8B4513', '&:hover': { bgcolor: '#654321' } }}>Siguiente</Button>
              )}
            </Box>
          </Card>
        </Container>

        <Dialog open={openFinishDialog} onClose={() => setOpenFinishDialog(false)}>
          <DialogTitle sx={{ fontWeight: 700, color: '#3E2723' }}>Finalizar evaluación</DialogTitle>
          <DialogContent><Typography sx={{ color: '#5D4037' }}>¿Finalizar evaluación? No podrás cambiar tus respuestas.</Typography></DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenFinishDialog(false)} sx={{ color: '#5D4037' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleConfirmFinalizar} sx={{ bgcolor: '#D2691E', '&:hover': { bgcolor: '#BF360C' } }}>Finalizar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MathJaxContext>
  );
}