'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Container, Paper, Typography, Card, CardContent, IconButton, Chip, List, ListItemButton, ListItem, ListItemText, ListItemAvatar, Avatar, Tabs, Tab, Alert, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, SelectChangeEvent, Menu, MenuItem, Radio, RadioGroup, FormControlLabel, Collapse,
} from '@mui/material';

import {
  ArrowBack, ContentCopy, Settings, Person, School, Group, ExitToApp, PersonAdd, Campaign, Add, Visibility, VisibilityOff, MoreVert, Edit, Delete, Comment as CommentIcon, Send as SendIcon, KeyboardArrowLeft, KeyboardArrowRight, PlayArrow
} from '@mui/icons-material';
import { claseService, ClaseDetalle } from '@/app/services/claseService';
import { authService } from '@/app/services/authService';
import { actividadService } from '@/app/services/actividadService';
import MatricularAlumnoDialog from '@/app/components/MatricularAlumnoDialog';
import EjercicioForm from '@/app/components/EjercicioForm';
import { ejercicioService } from '@/app/services/ejercicioService';
import OptionsEditor from '@/app/actividades/[claseId]/components/OptionsEditor';
import { anuncioService, Anuncio, CreateAnuncioData, Comentario } from '@/app/services/anuncioService';

// ... (Interfaces TabPanel y Comentario omitidas por brevedad, son las mismas de siempre)
interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel(props: TabPanelProps) { const { children, value, index, ...other } = props; return (<div hidden={value !== index} {...other}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>); }

export default function DetalleClasePage() {
  const router = useRouter();
  const params = useParams();
  const claseId = params.id as string;
  
  const [clase, setClase] = useState<ClaseDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  // ... (estados de dialogs varios)
  const [openPromoteDialog, setOpenPromoteDialog] = useState(false);
  const [openMatricularDialog, setOpenMatricularDialog] = useState(false);
  const [openCrearActividadDialog, setOpenCrearActividadDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [openSalirDialog, setOpenSalirDialog] = useState(false);
  
  // Estados anuncios/comentarios
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loadingAnuncios, setLoadingAnuncios] = useState(false);
  const [openAnuncioDialog, setOpenAnuncioDialog] = useState(false);
  const [editingAnuncio, setEditingAnuncio] = useState<Anuncio | null>(null);
  const [anuncioFormData, setAnuncioFormData] = useState<CreateAnuncioData>({ titulo: '', descripcion: '' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAnuncio, setSelectedAnuncio] = useState<Anuncio | null>(null);
  const [openDeleteAnuncioDialog, setOpenDeleteAnuncioDialog] = useState(false);
  const [submittingAnuncio, setSubmittingAnuncio] = useState(false);
  const [expandedAnuncioId, setExpandedAnuncioId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<{ [key: string]: Comentario[] }>({});
  const [paginationMap, setPaginationMap] = useState<{ [key: string]: { page: number; lastPage: number; total: number } }>({});
  const [loadingComments, setLoadingComments] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [openDeleteCommentDialog, setOpenDeleteCommentDialog] = useState(false);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<{ anuncioId: string; comentarioId: string } | null>(null);

  // Estados actividades
  const [actividades, setActividades] = useState<any[]>([]);
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [loadingActividades, setLoadingActividades] = useState(false);
  const [crearForm, setCrearForm] = useState<any>({ nombre: '', descripcion: '', tipo: 'practica', fechaInicio: '', fechaFin: '', isVisible: true, ejercicioIds: [], nuevosEjercicios: [] });
  const [editingActividadId, setEditingActividadId] = useState<string | null>(null);
  const [openVerActividad, setOpenVerActividad] = useState(false);
  const [verActividad, setVerActividad] = useState<any | null>(null);
  const [openCrearEjercicioModal, setOpenCrearEjercicioModal] = useState(false);
  const [crearEjercicioAttachActividadId, setCrearEjercicioAttachActividadId] = useState<string | null>(null);
  const [crearEjercicioLoading, setCrearEjercicioLoading] = useState(false);
  const [crearEjercicioError, setCrearEjercicioError] = useState('');

  const [selectedUsuarioId, setSelectedUsuarioId] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const user = authService.getUser();

  useEffect(() => {
    loadClase();
    loadActividades();
    loadAnuncios();
  }, [claseId]);

  // ... (Implementación completa de loadClase, loadActividades, loadAnuncios, handleCopy, etc. mantenida igual)
  const loadClase = async () => { try { setLoading(true); const res = await claseService.getClaseById(claseId); setClase({ ...res.clase, profesores: res.profesores, alumnos: res.alumnos }); } catch (err: any) { setError(err.message); } finally { setLoading(false); } };
  
  const loadActividades = async () => { 
    try { 
        setLoadingActividades(true); 
        const res = await actividadService.listarActividades(claseId); 
        setActividades(res.actividades || []); 
    } catch (err) { console.error(err); } finally { setLoadingActividades(false); } 
    try { const ej = await actividadService.listarEjercicios(claseId); setEjercicios(ej.ejercicios || []); } catch (err) {}
  };
  
  const loadAnuncios = async () => { try { setLoadingAnuncios(true); const res = await anuncioService.getAnunciosByClase(claseId); setAnuncios(res.anuncios); } finally { setLoadingAnuncios(false); } };

  // ... (Resto de handlers de diálogos y formularios se mantienen igual que en tu versión previa)
  // Solo incluyo el renderizado del botón nuevo para ahorrar espacio, el resto es boilerplate que ya tienes.

  const isoToDatetimeLocal = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); const tzoffset = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16); }
  const resetCrearForm = () => setCrearForm({ nombre: '', descripcion: '', tipo: 'practica', fechaInicio: '', fechaFin: '', isVisible: true, ejercicioIds: [], nuevosEjercicios: [] });
  const openCreateActivDialog = () => { resetCrearForm(); setEditingActividadId(null); setOpenCrearActividadDialog(true); }

  const handleCrearEjercicioSubmit = async (payload: any) => { /* ... */ };
  const handleCopyCodigo = () => { /* ... */ };
  const handlePromoverProfesor = async () => { /* ... */ };
  const handleMatricularAlumno = async (uid: string) => { /* ... */ };
  const handleSalirClase = async () => { setOpenSalirDialog(true); };
  // ... handlers anuncios ...
  const handleOpenAnuncioDialog = (a?: Anuncio) => { /* ... */ setOpenAnuncioDialog(true); };
  const handleCloseAnuncioDialog = () => { setOpenAnuncioDialog(false); };
  const handleSubmitAnuncio = async (e: React.FormEvent) => { /* ... */ };
  const handleMenuOpen = (e: any, a: Anuncio) => { setAnchorEl(e.currentTarget); setSelectedAnuncio(a); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedAnuncio(null); };
  const handleDeleteAnuncio = async () => { /* ... */ };
  const formatDate = (s: string) => new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  // ... handlers comentarios ...
  const loadComentarios = async (aid: string, p: number) => { /* ... */ };
  const handleToggleComments = async (aid: string) => { /* ... */ };
  const handleChangePage = async (aid: string, p: number) => { /* ... */ };
  const handleSendComment = async (aid: string) => { /* ... */ };
  const handleDeleteComment = (aid: string, cid: string) => { setDeleteCommentTarget({ anuncioId: aid, comentarioId: cid }); setOpenDeleteCommentDialog(true); };
  const handleConfirmDeleteComment = async () => { /* ... */ };


  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', height: '100vh', alignItems: 'center' }}><CircularProgress /></Box>;
  if (!clase) return <Alert severity="error">Clase no encontrada</Alert>;

  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* ... HEADER, INFO, TABS (Anuncios, Profesores, Alumnos) ... */}
        {/* (Mantener estructura existente) */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
             <Typography variant="h5">{clase.nombre}</Typography>
             <Box>{clase.isProfesor ? <Button onClick={() => router.push(`/clases/${claseId}/editar`)}><Settings /></Button> : <Button color="error" onClick={handleSalirClase}><ExitToApp /></Button>}</Box>
          </Box>
        </Paper>

        <Paper>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
             <Tab icon={<Campaign />} label="Anuncios" />
             <Tab icon={<School />} label="Profesores" />
             <Tab icon={<Group />} label="Alumnos" />
          </Tabs>
          
          {/* Panel Anuncios (con lógica de comentarios completa) */}
          <TabPanel value={tabValue} index={0}>
             {/* ... Renderizado de anuncios y comentarios (ya lo tenías completo) ... */}
          </TabPanel>
          <TabPanel value={tabValue} index={1}> <List>{clase.profesores.map(p => <ListItem key={p.id}><ListItemText primary={p.nombre} /></ListItem>)}</List> </TabPanel>
          <TabPanel value={tabValue} index={2}> <List>{clase.alumnos.map(a => <ListItem key={a.id}><ListItemText primary={a.nombre} /></ListItem>)}</List> </TabPanel>
        </Paper>

        {/* SECCIÓN ACTIVIDADES (ACTUALIZADA) */}
        <Paper sx={{ p: 3, mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Actividades</Typography>
            {clase.isProfesor && <Button variant="contained" onClick={() => openCreateActivDialog()} sx={{ bgcolor: '#8B4513' }}>Crear Actividad</Button>}
          </Box>

          {loadingActividades ? <CircularProgress /> : (
            <List>
              {actividades.map((a) => (
                <ListItem key={a.id} disablePadding sx={{ borderBottom: '1px solid #eee', ...(a.is_visible ? {} : { backgroundColor: 'rgba(255,152,0,0.06)' }) }}>
                  <ListItemButton 
                    onClick={() => {
                      if (!clase.isProfesor && a.tipo === 'evaluacion') {
                        router.push(`/actividades/${claseId}/realizar/${a.id}`);
                      } else {
                        router.push(`/actividades/${claseId}/ver/${a.id}`);
                      }
                    }}
                  >
                    <ListItemText primary={a.nombre} secondary={a.descripcion} sx={!a.is_visible ? { color: 'warning.main' } : {}} />
                    
                    <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                      {a.tipo === 'evaluacion' && <Chip label="Evaluación" size="small" sx={{ mr: 1 }} />}
                      
                      {/* BOTÓN DE ACCESO A EXAMEN */}
                      {!clase.isProfesor && a.tipo === 'evaluacion' && (
                        <>
                          {a.intento?.estado === 'finished' ? (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<Visibility />}
                              onClick={(e) => { e.stopPropagation(); router.push(`/actividades/${claseId}/realizar/${a.id}`); }}
                              sx={{ mr: 1, background: 'linear-gradient(135deg, #F57C00 0%, #FF9800 100%)' }}
                            >
                              Ver Resultado
                            </Button>
                          ) : (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<PlayArrow />}
                              onClick={(e) => { e.stopPropagation(); router.push(`/actividades/${claseId}/realizar/${a.id}`); }}
                              sx={{ mr: 1, background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)' }}
                            >
                              {a.intento?.estado === 'in_progress' ? 'Continuar' : 'Realizar'}
                            </Button>
                          )}
                        </>
                      )}
                      
                      {!a.is_visible && <Chip label="Oculta" color="warning" size="small" />}
                      {clase.isProfesor && (
                         <>
                           <IconButton size="small" onClick={(e) => { e.stopPropagation(); /* Edit Logic */ }}><Edit /></IconButton>
                           <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteTargetId(a.id); setOpenDeleteDialog(true); }}><Delete /></IconButton>
                         </>
                      )}
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
        
      </Container>
    </Box>
  );
}