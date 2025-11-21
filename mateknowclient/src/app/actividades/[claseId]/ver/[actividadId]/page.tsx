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
  IconButton
} from '@mui/material';
import { Delete } from '@mui/icons-material'; // Importamos el icono de eliminar
import { actividadService } from '@/app/services/actividadService';
import EjercicioForm from '@/app/components/EjercicioForm';
import { ejercicioService } from '@/app/services/ejercicioService';
import { claseService } from '@/app/services/claseService';

export default function ActividadVerPage() {
  const params = useParams();
  const claseId = params.claseId as string;
  const actividadId = params.actividadId as string;
  const router = useRouter();

  // --- ESTADOS ---
  const [actividad, setActividad] = useState<any | null>(null);
  const [isProfesor, setIsProfesor] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estado para el modal de "Agregar Ejercicio"
  const [openCrearEjercicioModal, setOpenCrearEjercicioModal] = useState(false);
  const [crearEjercicioLoading, setCrearEjercicioLoading] = useState(false);
  const [crearEjercicioError, setCrearEjercicioError] = useState('');

  // Estado para el modal de "Eliminar Ejercicio"
  const [openDeleteExerciseDialog, setOpenDeleteExerciseDialog] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<string | null>(null);

  // --- CARGA DE DATOS ---
  const loadData = async () => {
    try {
      setLoading(true);
      
      // CORRECCIÓN: Agregamos claseId como primer parámetro
      // 1. Obtener la actividad con detalle completo
      const res = await actividadService.getActividadById(claseId, actividadId);
      setActividad(res.actividad);

      // 2. Verificar rol del usuario
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

  // --- MANEJADORES ---

  // Función para ELIMINAR DEFINITIVAMENTE un ejercicio
  const handleDeleteExercise = async () => {
    // Cerrar modal inmediatamente
    setOpenDeleteExerciseDialog(false);
    
    if (!exerciseToDelete) return;

    try {
      setLoading(true); // Mostrar carga mientras procesa
      
      // LLAMADA CRÍTICA: Usamos eliminarEjercicio del servicio de EJERCICIOS.
      // Esto borrará el ejercicio de la tabla 'ejercicio' en la BD.
      await ejercicioService.eliminarEjercicio(exerciseToDelete);
      
      // Recargar datos para reflejar que ya no existe
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

  // --- RENDERIZADO ---
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
            {/* Header de la Actividad */}
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

            {/* Botones de Acción Principales */}
            <Box sx={{ mb: 3 }}>
              {/* Botón para Alumnos: Resolver */}
              {!isProfesor && actividad.tipo === 'evaluacion' && (
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={() => router.push(`/actividades/${claseId}/realizar/${actividadId}`)}
                  sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}
                >
                  Resolver Actividad
                </Button>
              )}
              
              {/* Botón para Profesores: Agregar Ejercicio */}
              {isProfesor && (
                <Button 
                  variant="contained" 
                  onClick={() => setOpenCrearEjercicioModal(true)}
                  sx={{ bgcolor: '#8B4513', '&:hover': { bgcolor: '#654321' } }}
                >
                  Agregar ejercicio
                </Button>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#3E2723' }}>
              Ejercicios ({actividad.ejercicios?.length || 0})
            </Typography>
            
            {/* LISTA DE EJERCICIOS */}
            {actividad.ejercicios && actividad.ejercicios.length > 0 ? (
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
                      // TACHO DE BASURA (Solo Profesor)
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
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {index + 1}.
                        </Typography>

                        {ej.tipo === "latex" ? (
                          <MathJaxContext
                            version={3}
                            config={{
                              loader: { load: ["input/tex", "output/chtml"] },
                              tex: {
                                inlineMath: [["$", "$"]],
                                displayMath: [],
                              },
                            }}
                          >
                            <MathJax dynamic>{wrapLatex(ej.enunciado)}</MathJax>
                          </MathJaxContext>
                        ) : (
                          <Typography variant="body1">{ej.enunciado}</Typography>
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

      {/* --- MODAL: CREAR EJERCICIO --- */}
      <Dialog open={openCrearEjercicioModal} onClose={() => setOpenCrearEjercicioModal(false)} fullWidth maxWidth="md">
        <DialogTitle>Crear y Agregar Ejercicio</DialogTitle>
        <DialogContent>
          <EjercicioForm
            onSubmit={async (payload: any) => {
              setCrearEjercicioLoading(true);
              setCrearEjercicioError('');
              try {
                // 1. Crear el ejercicio en la base de datos
                const res = await ejercicioService.crearEjercicio(payload);
                const newEjercicioId = res?.ejercicio?.id;
                
                if (newEjercicioId) {
                  // 2. Obtener la lista actual de IDs para no perderlos
                  const prevIds = (actividad.ejercicios || []).map((e: any) => e.id);
                  const newIds = [...prevIds, newEjercicioId];
                  
                  // 3. Actualizar la actividad vinculando el nuevo ID
                  await actividadService.editarActividad(claseId, actividadId, { ejercicioIds: newIds });
                  
                  setOpenCrearEjercicioModal(false);
                  
                  // 4. Recargar la página para mostrar el nuevo ejercicio
                  await loadData();
                }
              } catch (err: any) {
                console.error(err);
                setCrearEjercicioError(err.response?.data?.message || 'Error al crear ejercicio');
              } finally {
                setCrearEjercicioLoading(false);
              }
            }}
            submitButtonText="Crear y agregar"
            loading={crearEjercicioLoading}
            error={crearEjercicioError}
            onCancel={() => setOpenCrearEjercicioModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* --- MODAL: CONFIRMAR ELIMINACIÓN --- */}
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