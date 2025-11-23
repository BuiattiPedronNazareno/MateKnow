'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MathJax, MathJaxContext } from "better-react-mathjax";
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
} from '@mui/material';
import { 
  Delete,
  Visibility, 
  VisibilityOff, 
  CheckCircle, 
  RadioButtonUnchecked,
  AddRounded,
} from '@mui/icons-material';
import { actividadService } from '@/app/services/actividadService';
import EjercicioForm from '@/app/components/EjercicioForm';
import { ejercicioService } from '@/app/services/ejercicioService';
import { claseService } from '@/app/services/claseService';

export default function ActividadVerPage() {
  const params = useParams();
  const claseId = params.claseId as string;
  const actividadId = params.actividadId as string;
  const router = useRouter();

  const [verRespuestas, setVerRespuestas] = useState(false);
  const [actividad, setActividad] = useState<any | null>(null);
  const [isProfesor, setIsProfesor] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [openCrearEjercicioModal, setOpenCrearEjercicioModal] = useState(false);
  const [crearEjercicioLoading, setCrearEjercicioLoading] = useState(false);
  const [crearEjercicioError, setCrearEjercicioError] = useState('');

  const [openDeleteExerciseDialog, setOpenDeleteExerciseDialog] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const res = await actividadService.getActividadById(claseId, actividadId);
      setActividad(res.actividad);

      const c = await claseService.getClaseById(claseId);
      setIsProfesor(!!c.clase.isProfesor);

    } catch (err) {
      console.error("Error cargando actividad:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (claseId && actividadId) {
      loadData();
    }
  }, [claseId, actividadId]);

  const handleDeleteExercise = async () => {
    setOpenDeleteExerciseDialog(false);
    
    if (!exerciseToDelete) return;

    try {
      setLoading(true);
      await ejercicioService.eliminarEjercicio(exerciseToDelete);
      await loadData();
      console.log('Ejercicio eliminado permanentemente.');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error al eliminar el ejercicio');
      setLoading(false); 
    } finally {
      setExerciseToDelete(null);
    }
  };

  // ✅ FUNCIÓN CORREGIDA - Solo vincula, NO crea
  const handleCrearEjercicioSubmit = async (payload: any) => {
    setCrearEjercicioLoading(true);
    setCrearEjercicioError('');
    
    try {
      // ✅ SI PAYLOAD TIENE 'id', significa que el ejercicio YA FUE CREADO por EjercicioForm
      // Solo necesitamos vincularlo a la actividad
      if (payload.id) {
        console.log('🔗 Ejercicio ya creado, solo vinculando:', payload.id);
        
        const prevIds = (actividad.ejercicios || []).map((e: any) => e.id);
        const newIds = [...prevIds, payload.id];
        
        await actividadService.editarActividad(claseId, actividadId, { ejercicioIds: newIds });
        
        setOpenCrearEjercicioModal(false);
        await loadData();
        
        console.log('✅ Ejercicio vinculado exitosamente');
        return;
      }

      // ❌ Si no tiene ID, es un ejercicio normal que necesitamos crear primero
      console.log('📝 Creando ejercicio NORMAL');
      
      const res = await ejercicioService.crearEjercicio(payload);
      const newEjercicioId = res?.ejercicio?.id;
      
      if (newEjercicioId) {
        const prevIds = (actividad.ejercicios || []).map((e: any) => e.id);
        const newIds = [...prevIds, newEjercicioId];
        
        await actividadService.editarActividad(claseId, actividadId, { ejercicioIds: newIds });
        
        setOpenCrearEjercicioModal(false);
        await loadData();
        
        console.log('✅ Ejercicio creado y vinculado exitosamente');
      }
    } catch (err: any) {
      console.error('❌ Error al crear ejercicio:', err);
      setCrearEjercicioError(err.response?.data?.message || err.message || 'Error al crear ejercicio');
    } finally {
      setCrearEjercicioLoading(false);
    }
  };

  const wrapLatex = (txt: string) => {
    const t = txt.trim();
    if (t.startsWith("$") && t.endsWith("$")) return txt;
    return txt;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, bgcolor: '#F5DEB3', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#8B4513' }} />
      </Box>
    );
  }

  if (!actividad) {
    return (
      <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="md">
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error">Actividad no encontrada</Typography>
            <Button onClick={() => router.back()} sx={{ mt: 2 }}>Volver</Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="md">
          <Button onClick={() => router.back()} sx={{ mb: 2, color: '#3E2723' }}>Volver</Button>
          
          <Paper sx={{ p: 4, borderRadius: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#3E2723', mb: 1 }}>
              {actividad.nombre}
            </Typography>
            
            <Typography variant="body1" sx={{ color: '#5D4037', mb: 3 }}>
              {actividad.descripcion}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              {actividad.tipo === 'evaluacion' ? (
                <Chip label="Evaluación" color="primary" />
              ) : (
                <Chip label="Práctica" variant="outlined" />
              )}
              {!actividad.is_visible && <Chip label="Oculta" color="warning" />}
            </Box>

            <Box>
              {isProfesor && (
                <>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={verRespuestas ? <VisibilityOff /> : <Visibility />}
                    onClick={() => setVerRespuestas(!verRespuestas)}
                    sx={{ mr: 2 }}
                  >
                    {verRespuestas ? 'Ocultar Respuestas' : 'Ver Respuestas'}
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<AddRounded />}
                    onClick={() => setOpenCrearEjercicioModal(true)}
                  >
                    Agregar Ejercicio
                  </Button>
                </>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#3E2723' }}>
              Ejercicios ({actividad.ejercicios?.length || 0})
            </Typography>
            
            {actividad.ejercicios && actividad.ejercicios.length > 0 ? (
              <MathJaxContext
                version={3}
                config={{
                  loader: { load: ["input/tex", "output/chtml"] },
                  tex: {
                    inlineMath: [["$", "$"], ["\\(", "\\)"]],
                    displayMath: [["$$", "$$"]],
                  },
                }}
              >
                <List>
                  {actividad.ejercicios.map((ej: any, index: number) => (
                    <ListItem 
                      key={ej.id} 
                      sx={{ 
                        alignItems: 'flex-start', 
                        bgcolor: 'rgba(139, 69, 19, 0.05)', 
                        mb: 2, 
                        borderRadius: 2,
                        border: '1px solid rgba(139, 69, 19, 0.1)'
                      }}
                      secondaryAction={
                        isProfesor && (
                          <IconButton 
                            edge="end" 
                            aria-label="delete"
                            onClick={() => {
                              setExerciseToDelete(ej.id);
                              setOpenDeleteExerciseDialog(true);
                            }}
                            sx={{ color: '#D32F2F' }}
                          >
                            <Delete />
                          </IconButton>
                        )
                      }
                    >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {index + 1}.
                            </Typography>

                            {ej.tipo === "latex" ? (
                              <MathJax dynamic>{wrapLatex(ej.enunciado)}</MathJax>
                            ) : (
                              <Typography variant="body1">{ej.enunciado}</Typography>
                            )}
                          </Box>

                          {verRespuestas && ej.opciones && (
                            <Box sx={{ mt: 2, pl: 2, width: '100%' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>
                                SOLUCIÓN:
                              </Typography>
                              
                              <Stack spacing={1}>
                                {ej.opciones.map((opcion: any, idx: number) => {
                                  const esCorrecta = opcion.esCorrecta || opcion.es_correcta || opcion.is_correcta;

                                  return (
                                    <Paper
                                      key={idx}
                                      variant="outlined"
                                      sx={{
                                        p: 1.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderColor: esCorrecta ? 'success.main' : 'rgba(0,0,0,0.12)',
                                        bgcolor: esCorrecta ? 'rgba(46, 125, 50, 0.08)' : 'transparent',
                                      }}
                                    >
                                      {esCorrecta ? (
                                        <CheckCircle color="success" sx={{ mr: 2, fontSize: 20 }} />
                                      ) : (
                                        <RadioButtonUnchecked color="disabled" sx={{ mr: 2, fontSize: 20 }} />
                                      )}
                                      
                                      <Typography 
                                        variant="body2" 
                                        component="div"
                                        sx={{ 
                                          fontWeight: esCorrecta ? 600 : 400,
                                          color: esCorrecta ? 'success.dark' : 'text.primary'
                                        }}
                                      >
                                        <MathJax inline>{opcion.texto}</MathJax>
                                      </Typography>
                                    </Paper>
                                  );
                                })}
                              </Stack>
                            </Box>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Chip 
                            label={ej.tipo === 'multiple-choice' ? 'Multiple Choice' : ej.tipo === 'true_false' ? 'V/F' : 'Abierta'} 
                            size="small" 
                            variant="outlined"
                            sx={{ mr: 1, height: 20, fontSize: '0.7rem' }} 
                          />
                          <Typography variant="caption" component="span" color="text.secondary">
                            {ej.puntos ? `${ej.puntos} puntos` : '1 punto'}
                          </Typography>
                        </Box>
                      }
                      slotProps={{ secondary: { component: 'div' } }}
                    />
                    </ListItem>
                  ))}
                </List>
              </MathJaxContext>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#fafafa', borderRadius: 2 }}>
                <Typography color="text.secondary">
                  Aún no hay ejercicios asociados a esta actividad.
                </Typography>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>

      <Dialog open={openCrearEjercicioModal} onClose={() => setOpenCrearEjercicioModal(false)} fullWidth maxWidth="md">
        <DialogTitle>Crear y Agregar Ejercicio</DialogTitle>
        <DialogContent>
          <EjercicioForm
            onSubmit={handleCrearEjercicioSubmit}
            submitButtonText="Crear y agregar"
            loading={crearEjercicioLoading}
            error={crearEjercicioError}
            onCancel={() => setOpenCrearEjercicioModal(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={openDeleteExerciseDialog} onClose={() => setOpenDeleteExerciseDialog(false)}>
        <DialogTitle>Eliminar ejercicio permanentemente</DialogTitle>
        <DialogContent>
          <Typography color="error" sx={{ fontWeight: 'bold', mb: 2 }}>
            ¡Atención!
          </Typography>
          <Typography>
            Esta acción <b>eliminará el ejercicio de la base de datos permanentemente</b>.
            <br/>
            No podrá recuperarse y desaparecerá de cualquier otra actividad donde se esté usando.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteExerciseDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleDeleteExercise} 
            color="error" 
            variant="contained"
            autoFocus
          >
            Eliminar definitivamente
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}