'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  List,
  ListItemButton,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  Collapse,
} from '@mui/material';

import {
  ArrowBack,
  ContentCopy,
  Settings,
  Person,
  School,
  Group,
  ExitToApp,
  PersonAdd,
  Campaign,
  Add,
  Visibility,
  VisibilityOff,
  MoreVert,
  Edit,
  Delete,
  Comment as CommentIcon,
  Send as SendIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  PlayArrow, 
  History, 
  RestartAlt,
  Assignment, 
  RateReview,
  EventBusy,
} from '@mui/icons-material';

import { claseService, ClaseDetalle } from '@/app/services/claseService';
import { authService } from '@/app/services/authService';
import { actividadService } from '@/app/services/actividadService';
import MatricularAlumnoDialog from '@/app/components/MatricularAlumnoDialog';
import EjercicioForm from '@/app/components/EjercicioForm';
import { ejercicioService } from '@/app/services/ejercicioService';
import OptionsEditor from '@/app/actividades/[claseId]/components/OptionsEditor';
import { anuncioService, Anuncio, CreateAnuncioData, Comentario } from '@/app/services/anuncioService';
import { SportsEsports } from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function DetalleClasePage() {
  const [openExpiredDialog, setOpenExpiredDialog] = useState(false);
  const [expiredActivityDate, setExpiredActivityDate] = useState<string | null>(null);
  const [openNotAttemptedDialog, setOpenNotAttemptedDialog] = useState(false);

  const router = useRouter();
  const params = useParams();
  const claseId = params.id as string;
  
  const [clase, setClase] = useState<ClaseDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [openPromoteDialog, setOpenPromoteDialog] = useState(false);
  const [openMatricularDialog, setOpenMatricularDialog] = useState(false);
  const [openCrearActividadDialog, setOpenCrearActividadDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [openSalirDialog, setOpenSalirDialog] = useState(false);
  const [openDeleteAnuncioDialog, setOpenDeleteAnuncioDialog] = useState(false);
  const [crearForm, setCrearForm] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'practica',
    fechaInicio: '',
    fechaFin: '',
    isVisible: true,
    ejercicioIds: [] as string[],
    nuevosEjercicios: [] as any[],
  });

  const [openVerActividad, setOpenVerActividad] = useState(false);
  const [verActividad, setVerActividad] = useState<any | null>(null);
  const [openCrearEjercicioModal, setOpenCrearEjercicioModal] = useState(false);
  const [crearEjercicioAttachActividadId, setCrearEjercicioAttachActividadId] = useState<string | null>(null);
  const [crearEjercicioLoading, setCrearEjercicioLoading] = useState(false);
  const [crearEjercicioError, setCrearEjercicioError] = useState('');

  // Estados para anuncios
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loadingAnuncios, setLoadingAnuncios] = useState(false);
  const [openAnuncioDialog, setOpenAnuncioDialog] = useState(false);
  const [editingAnuncio, setEditingAnuncio] = useState<Anuncio | null>(null);
  const [anuncioFormData, setAnuncioFormData] = useState<CreateAnuncioData>({
    titulo: '',
    descripcion: '',
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAnuncio, setSelectedAnuncio] = useState<Anuncio | null>(null);
  const [submittingAnuncio, setSubmittingAnuncio] = useState(false);
  const [anunciosMeta, setAnunciosMeta] = useState({ page: 1, lastPage: 1, total: 0 }); 

  // Estados para comentarios
  const [expandedAnuncioId, setExpandedAnuncioId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<{ [key: string]: Comentario[] }>({});
  const [paginationMap, setPaginationMap] = useState<{ [key: string]: { page: number; lastPage: number; total: number } }>({});
  const [loadingComments, setLoadingComments] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  
  // Estados para el modal de eliminar comentario
  const [openDeleteCommentDialog, setOpenDeleteCommentDialog] = useState(false);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<{ anuncioId: string; comentarioId: string } | null>(null);

  // Estados para historial
  // Agrega estados si te faltan
  const [openHistorialDialog, setOpenHistorialDialog] = useState(false);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialData, setHistorialData] = useState<any[]>([]);
  const [historialActividadId, setHistorialActividadId] = useState<string>('');

  const handleOpenHistorial = async (actividadId: string) => {
    setHistorialActividadId(actividadId); 
    setOpenHistorialDialog(true);
    setHistorialLoading(true);
    setHistorialData([]);
    try {
      // Pasamos claseId (variable del componente) y actividadId
      const res = await actividadService.getHistorialIntentos(claseId, actividadId);
      setHistorialData(res.intentos);
    } catch (err) {
      console.error(err);
    } finally {
      setHistorialLoading(false);
    }
  };

  const handleCrearEjercicioSubmit = async (payload: any) => {
    setCrearEjercicioLoading(true);
    setCrearEjercicioError('');
    try {
      const res = await ejercicioService.crearEjercicio(payload);
      const newEjercicioId = res?.ejercicio?.id;
      if (crearEjercicioAttachActividadId && newEjercicioId) {
        try {
          const all = await actividadService.listarActividades(claseId);
          const current = (all.actividades || []).find((x: any) => x.id === crearEjercicioAttachActividadId);
          const prevIds = (current?.ejercicios || []).map((e: any) => e.id);
          await actividadService.editarActividad(claseId, crearEjercicioAttachActividadId, { ejercicioIds: [...prevIds, newEjercicioId] });
          setOpenCrearEjercicioModal(false);
          setCrearEjercicioAttachActividadId(null);
          await loadActividades();
          return;
        } catch (err) {
          console.error('Error attaching ejercicio', err);
        }
      }
      setOpenCrearEjercicioModal(false);
      await loadActividades();
    } catch (err: any) {
      setCrearEjercicioError(err.response?.data?.message || 'Error al crear ejercicio');
    } finally {
      setCrearEjercicioLoading(false);
    }
  };
  const [editingActividadId, setEditingActividadId] = useState<string | null>(null);

  const isoToDatetimeLocal = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const tzoffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
  }

  const resetCrearForm = () => setCrearForm({
    nombre: '',
    descripcion: '',
    tipo: 'practica',
    fechaInicio: '',
    fechaFin: '',
    isVisible: true,
    ejercicioIds: [],
    nuevosEjercicios: [],
  });

  const openCreateActivDialog = () => {
    resetCrearForm();
    setEditingActividadId(null);
    setOpenCrearActividadDialog(true);
  }
  const [actividades, setActividades] = useState<any[]>([]);
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [loadingActividades, setLoadingActividades] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const user = authService.getUser();

  useEffect(() => {
    if (claseId) {
        loadClase();
        loadActividades();
        loadAnuncios(1); // Cargar página 1
    }
    // ... resto del effect
  }, [claseId]);

  const loadClase = async () => {
    try {
      setLoading(true);
      const response = await claseService.getClaseById(claseId);
      setClase({
        ...response.clase,
        profesores: response.profesores,
        alumnos: response.alumnos,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar la clase');
    } finally {
      setLoading(false);
    }
  };

  const loadActividades = async () => {
    try {
      setLoadingActividades(true);
      const res = await actividadService.listarActividades(claseId);
      setActividades(res.actividades || []);
    } catch (err: any) {
      console.error('Error al cargar actividades:', err?.response?.data || err.message || err);
    } finally {
      setLoadingActividades(false);
      try {
        const ej = await actividadService.listarEjercicios(claseId);
        setEjercicios(ej.ejercicios || []);
      } catch (err) {
        // ignore
      }
    }
  };

  const loadAnuncios = async (page: number = 1) => {
    try {
      setLoadingAnuncios(true);
      const response = await anuncioService.getAnunciosByClase(claseId, page);
      setAnuncios(response.anuncios);
      setAnunciosMeta(response.meta);
    } catch (err) {
      console.error("Error cargando anuncios", err);
    } finally {
      setLoadingAnuncios(false);
    }
  };

  const handleCopyCodigo = () => {
    if (clase) {
      navigator.clipboard.writeText(clase.codigo);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handlePromoverProfesor = async () => {
    if (!selectedUsuarioId) return;
    
    try {
      await claseService.addProfesor(claseId, selectedUsuarioId);
      setOpenPromoteDialog(false);
      setSelectedUsuarioId('');
      await loadClase();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al promover a profesor');
    }
  };

  const handleMatricularAlumno = async (usuarioId: string) => {
    try {
      await claseService.matricularAlumno(claseId, usuarioId);
      await loadClase();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Error al matricular alumno');
    }
  };

  const handleSalirClase = async () => {
    setOpenSalirDialog(true);
  };

  // Funciones para manejar anuncios
  const handleOpenAnuncioDialog = (anuncio?: Anuncio) => {
    if (anuncio) {
      setEditingAnuncio(anuncio);
      setAnuncioFormData({
        titulo: anuncio.titulo,
        descripcion: anuncio.descripcion,
      });
    } else {
      setEditingAnuncio(null);
      setAnuncioFormData({ titulo: '', descripcion: '' });
    }
    setOpenAnuncioDialog(true);
  };

  const handleCloseAnuncioDialog = () => {
    setOpenAnuncioDialog(false);
    setEditingAnuncio(null);
    setAnuncioFormData({ titulo: '', descripcion: '' });
  };

  const handleSubmitAnuncio = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!anuncioFormData.titulo.trim() || !anuncioFormData.descripcion.trim()) {
      setError('Todos los campos son obligatorios');
      return;
    }

    try {
      setSubmittingAnuncio(true);
      setError('');

      if (editingAnuncio) {
        await anuncioService.updateAnuncio(editingAnuncio.id, anuncioFormData);
      } else {
        await anuncioService.createAnuncio(claseId, anuncioFormData);
      }

      await loadAnuncios();
      handleCloseAnuncioDialog();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar anuncio');
    } finally {
      setSubmittingAnuncio(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, anuncio: Anuncio) => {
    setAnchorEl(event.currentTarget);
    setSelectedAnuncio(anuncio);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAnuncio(null);
  };

  const handleDeleteAnuncio = async () => {
    if (!selectedAnuncio) return;
    setOpenDeleteAnuncioDialog(true);
    handleMenuClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // --- FUNCIONALIDAD DE COMENTARIOS ---
  
  const loadComentarios = async (anuncioId: string, page: number = 1) => {
    try {
      setLoadingComments(anuncioId);
      const res = await anuncioService.getComentarios(anuncioId, page);
      
      setCommentsMap(prev => ({ ...prev, [anuncioId]: res.comentarios }));
      setPaginationMap(prev => ({ 
        ...prev, 
        [anuncioId]: { 
          page: res.meta.page, 
          lastPage: res.meta.lastPage,
          total: res.meta.total
        } 
      }));
    } catch (err) {
      console.error("Error cargando comentarios", err);
    } finally {
      setLoadingComments(null);
    }
  };

  const handleToggleComments = async (anuncioId: string) => {
    if (expandedAnuncioId === anuncioId) {
      setExpandedAnuncioId(null);
      return;
    }
    setExpandedAnuncioId(anuncioId);
    // Cargar siempre la página 1 al abrir
    await loadComentarios(anuncioId, 1);
  };

  const handleChangePage = async (anuncioId: string, newPage: number) => {
    await loadComentarios(anuncioId, newPage);
  };

  const handleSendComment = async (anuncioId: string) => {
    if (!newCommentText.trim()) return;
    try {
      await anuncioService.createComentario(anuncioId, newCommentText);
      setNewCommentText('');
      // Recargar página 1 para ver el nuevo comentario
      await loadComentarios(anuncioId, 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al comentar');
    }
  };

  // Abre el modal de confirmación
  const handleDeleteComment = (anuncioId: string, comentarioId: string) => {
    setDeleteCommentTarget({ anuncioId, comentarioId });
    setOpenDeleteCommentDialog(true);
  };

  // Ejecuta la eliminación (Instantáneo)
  const handleConfirmDeleteComment = async () => {
    // 1. Cierre instantáneo
    setOpenDeleteCommentDialog(false);

    if (!deleteCommentTarget) return;
    const { anuncioId, comentarioId } = deleteCommentTarget;

    // 2. Operación en segundo plano
    try {
      await anuncioService.deleteComentario(comentarioId);
      // Recargar la página actual para mantener contexto
      const currentPage = paginationMap[anuncioId]?.page || 1;
      await loadComentarios(anuncioId, currentPage);
      setDeleteCommentTarget(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar comentario');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!clase) {
    return (
      <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="lg">
          <Alert severity="error">Clase no encontrada</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => router.push('/dashboard')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#3E2723' }}>
              {clase.nombre}
            </Typography>
          </Box>
          <Box>
            {clase.isProfesor && (
              <>
                {!clase.isPublico && (
                  <Button
                    startIcon={<PersonAdd />}
                    onClick={() => setOpenMatricularDialog(true)}
                    sx={{ 
                      mr: 1,
                      background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #654321 0%, #A0522D 100%)',
                      }
                    }}
                  >
                    Matricular Alumno
                  </Button>
                )}
                <Button
                  startIcon={<Settings />}
                  onClick={() => router.push(`/clases/${claseId}/editar`)}
                  sx={{ mr: 1 }}
                >
                  Configurar
                </Button>
              </>
            )}
            {!clase.isProfesor && (
              <Button
                startIcon={<ExitToApp />}
                color="error"
                onClick={handleSalirClase}
              >
                Salir de Clase
              </Button>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {copySuccess && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setCopySuccess(false)}>
            ¡Código copiado al portapapeles!
          </Alert>
        )}

        {/* Información de la clase */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Descripción
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {clase.descripcion}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', ml: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Código de clase
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: 'monospace',
                    color: '#8B4513',
                    fontWeight: 700,
                  }}
                >
                  {clase.codigo}
                </Typography>
                <IconButton onClick={handleCopyCodigo} color="primary">
                  <ContentCopy />
                </IconButton>
              </Box>
              
              {/* BOTÓN MODO VERSUS */}
              <Button
                variant="contained"
                startIcon={<SportsEsports />}
                onClick={() => router.push(`/versus?claseId=${claseId}`)}
                sx={{
                  mt: 2,
                  background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                  color: 'white',
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3,
                  boxShadow: '0 4px 15px rgba(139, 69, 19, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #654321 0%, #A0522D 100%)',
                    transform: 'scale(1.02)',
                    boxShadow: '0 6px 20px rgba(139, 69, 19, 0.4)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Modo Versus
              </Button>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            {clase.isProfesor && (
              <Chip label="Profesor" color="primary" />
            )}
            <Chip
              label={clase.isPublico ? 'Pública' : 'Privada'}
              variant="outlined"
            />
          </Box>
        </Paper>

        {/* Tabs */}
        <Paper>
          <Tabs
            value={tabValue}
            onChange={(e: React.SyntheticEvent, newValue: number) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              icon={<Campaign />} 
              label={`Anuncios (${anuncios.length})`} 
              iconPosition="start" 
            />
            <Tab 
              icon={<Assignment />} 
              label={`Actividades (${actividades.length})`} 
              iconPosition="start" 
            />
            <Tab 
              icon={<School />} 
              label={`Profesores (${clase.profesores.length})`} 
              iconPosition="start" 
            />
            <Tab 
              icon={<Group />} 
              label={`Alumnos (${clase.alumnos.length})`} 
              iconPosition="start" 
            />
          </Tabs>

          {/* Tab de Anuncios */}
          <TabPanel value={tabValue} index={0}>
            {clase.isProfesor && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, px: 2, pt: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenAnuncioDialog()}
                  sx={{ background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)' }}
                >
                  Nuevo Anuncio
                </Button>
              </Box>
            )}

            {loadingAnuncios ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : anuncios.length === 0 ? (
              <Card sx={{ textAlign: 'center', py: 8 }}>
                <Campaign sx={{ fontSize: 80, color: '#DEB887', mb: 2 }} />
                <Typography variant="h6" gutterBottom>No hay anuncios aún</Typography>
                <Typography variant="body2" color="text.secondary">
                  {clase.isProfesor ? 'Crea el primer anuncio para mantener informados a tus alumnos' : 'El profesor aún no ha publicado anuncios'}
                </Typography>
              </Card>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, px: 2 }}>
                {anuncios.map((anuncio) => (
                  <Card 
                    key={anuncio.id}
                    sx={{
                      position: 'relative',
                      background: '#FFFACD',
                      borderRadius: 1,
                      border: '1px solid #F0E68C',
                      boxShadow: '4px 4px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    {/* ... (CONTENIDO DE LA TARJETA DE ANUNCIO SE MANTIENE IGUAL) ... */}
                    {/* ... (CardContent, Header, Descripción, Avatar, Comentarios, etc.) ... */}
                    {/* ... Copia el contenido interno de la Card que ya tenías ... */}
                    <CardContent sx={{ pt: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#3E2723', flex: 1 }}>{anuncio.titulo}</Typography>
                        {clase.isProfesor && (
                          <IconButton 
                            size="small" 
                            onClick={(e: React.MouseEvent<HTMLElement>) => handleMenuOpen(e, anuncio)}
                            sx={{ color: '#8B4513', ml: 'auto', display: anuncio.autor.id === user?.id ? 'flex' : 'none' }}
                          >
                            <MoreVert />
                          </IconButton>
                        )}
                      </Box>
                      <Typography variant="body1" sx={{ color: '#5D4037', mb: 2, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{anuncio.descripcion}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#8B4513', fontSize: '0.75rem', fontWeight: 600 }}>
                          {anuncio.autor.nombre[0]}{anuncio.autor.apellido[0]}
                        </Avatar>
                        <Typography variant="caption" sx={{ color: '#8B4513', fontWeight: 500 }}>
                          {anuncio.autor.nombre} {anuncio.autor.apellido} • {formatDate(anuncio.fechaPublicacion)}
                        </Typography>
                      </Box>

                      {/* SECCIÓN DE COMENTARIOS (Sin cambios en lógica interna) */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <Button size="small" startIcon={<CommentIcon />} onClick={() => handleToggleComments(anuncio.id)} sx={{ color: '#8B4513' }}>
                          {expandedAnuncioId === anuncio.id ? 'Ocultar consultas' : 'Ver consultas'}
                        </Button>
                      </Box>
                      {/* ... (Resto del bloque de comentarios igual que antes) ... */}
                       <Collapse in={expandedAnuncioId === anuncio.id} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 2, pl: 2, pr: 2, pb: 2, bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }}>
                          {loadingComments === anuncio.id ? (
                            <CircularProgress size={20} sx={{ display: 'block', mx: 'auto', my: 2 }} />
                          ) : (commentsMap[anuncio.id] || []).length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No hay consultas aún. ¡Sé el primero!</Typography>
                          ) : (
                            <>
                              <List dense>
                                {(commentsMap[anuncio.id] || []).map((comentario) => (
                                  <ListItem key={comentario.id} alignItems="flex-start" sx={{ bgcolor: 'white', mb: 1, borderRadius: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} secondaryAction={clase.isProfesor && (
                                        <IconButton edge="end" size="small" onClick={() => handleDeleteComment(anuncio.id, comentario.id)}>
                                          <Delete fontSize="small" color="action" />
                                        </IconButton>
                                    )}>
                                    <ListItemAvatar sx={{ minWidth: 40 }}>
                                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.6rem', bgcolor: '#A0522D' }}>{comentario.autor.nombre[0]}</Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                      primary={<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{comentario.autor.nombre} {comentario.autor.apellido}</Typography>
                                          <Typography variant="caption" color="text.secondary">{formatDate(comentario.createdAt)}</Typography>
                                        </Box>}
                                      secondary={<Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>{comentario.contenido}</Typography>}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                              {paginationMap[anuncio.id] && paginationMap[anuncio.id].lastPage > 1 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 1, mb: 1 }}>
                                  <IconButton size="small" disabled={paginationMap[anuncio.id].page === 1} onClick={() => handleChangePage(anuncio.id, paginationMap[anuncio.id].page - 1)}><KeyboardArrowLeft /></IconButton>
                                  <Typography variant="caption" color="text.secondary">Página {paginationMap[anuncio.id].page} de {paginationMap[anuncio.id].lastPage}</Typography>
                                  <IconButton size="small" disabled={paginationMap[anuncio.id].page === paginationMap[anuncio.id].lastPage} onClick={() => handleChangePage(anuncio.id, paginationMap[anuncio.id].page + 1)}><KeyboardArrowRight /></IconButton>
                                </Box>
                              )}
                            </>
                          )}
                          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <TextField fullWidth size="small" placeholder="Escribe una consulta..." value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') handleSendComment(anuncio.id); }} sx={{ bgcolor: 'white' }} />
                            <IconButton onClick={() => handleSendComment(anuncio.id)} disabled={!newCommentText.trim()} sx={{ bgcolor: '#8B4513', color: 'white', width: 40, height: 40, '&:hover': { bgcolor: '#5D4037' }, '&.Mui-disabled': { bgcolor: 'rgba(0, 0, 0, 0.12)', color: 'rgba(0, 0, 0, 0.26)' } }}>
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Collapse>
                    </CardContent>
                  </Card>
                ))}

                {/* CONTROLES DE PAGINACIÓN DE ANUNCIOS */}
                {anunciosMeta.lastPage > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2, mb: 2 }}>
                    <IconButton 
                      onClick={() => loadAnuncios(anunciosMeta.page - 1)} 
                      disabled={anunciosMeta.page === 1}
                      sx={{ bgcolor: 'white', boxShadow: 1 }}
                    >
                      <KeyboardArrowLeft />
                    </IconButton>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                      Página {anunciosMeta.page} de {anunciosMeta.lastPage}
                    </Typography>

                    <IconButton 
                      onClick={() => loadAnuncios(anunciosMeta.page + 1)} 
                      disabled={anunciosMeta.page === anunciosMeta.lastPage}
                      sx={{ bgcolor: 'white', boxShadow: 1 }}
                    >
                      <KeyboardArrowRight />
                    </IconButton>
                  </Box>
                )}
              </Box>
            )}
          </TabPanel>

          {/* Tab de Actividades */}
          <TabPanel value={tabValue} index={1}>
            {clase.isProfesor && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, px: 2, pt: 1 }}>
                <Button 
                  startIcon={<Add />}
                  variant="contained" 
                  onClick={() => openCreateActivDialog()} 
                  sx={{ background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)', color: 'white' }}
                >
                  Crear Actividad
                </Button>
              </Box>
            )}

            {loadingActividades ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : actividades.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>No hay actividades aún.</Typography>
            ) : (
            <List>
              {actividades.map((a) => (
                <ListItem key={a.id} disablePadding sx={{ borderBottom: '1px solid #eee', ...(a.is_visible ? {} : { backgroundColor: 'rgba(255,152,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }) }}>
                  <ListItemButton 
                    onClick={() => {
                      if (!clase.isProfesor) {
                         // LÓGICA DE ACCESO ALUMNO
                         const now = new Date();
                         const fechaFin = a.fecha_fin ? new Date(a.fecha_fin) : null;
                         const isExpired = a.tipo === 'evaluacion' && fechaFin && now > fechaFin;
                         const isFinished = a.intento?.estado === 'finished';
                         const hasAttempt = !!a.intento;

                         // CASO 1: Vencida y NUNCA se intentó -> Mostrar aviso "No intentado"
                         if (isExpired && !hasAttempt) {
                            setOpenNotAttemptedDialog(true);
                            return;
                         }

                         // CASO 2: Vencida y quedó Incompleta (In Progress) -> Mostrar aviso "Vencida"
                         if (isExpired && !isFinished && hasAttempt) {
                            setExpiredActivityDate(a.fecha_fin);
                            setOpenExpiredDialog(true);
                            return;
                         }

                         // CASO 3: Habilitada (Vigente o Terminada) -> Navegar
                         router.push(`/actividades/${claseId}/realizar/${a.id}`);
                      } else {
                         // PROFESOR -> Ver detalle
                         router.push(`/actividades/${claseId}/ver/${a.id}`);
                      }
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <ListItemText primary={a.nombre} secondary={a.descripcion} sx={!a.is_visible ? { color: 'warning.main' } : {}} />
                    
                    <Box sx={{ ml: 2, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 1 }}>
                      {a.tipo === 'evaluacion' && <Chip label="Evaluación" size="small" />}
                      {a.tipo === 'practica' && <Chip label="Práctica" size="small" variant="outlined" />}
                      
                      {/* --- BOTONES DINÁMICOS ALUMNO --- */}
                      {!clase.isProfesor && (
                        <>
                           {/* EVALUACIÓN */}
                           {a.tipo === 'evaluacion' && (() => {
                              const now = new Date();
                              const fechaFin = a.fecha_fin ? new Date(a.fecha_fin) : null;
                              const isExpired = fechaFin && now > fechaFin;
                              const isFinished = a.intento?.estado === 'finished';
                              const hasAttempt = !!a.intento;

                              // SI YA TERMINÓ O SI YA VENCIÓ -> VER RESULTADO
                              if (isFinished || isExpired) {
                                return (
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {/* Leyenda "No intentado" */}
                                    {isExpired && !hasAttempt && (
                                       <Typography variant="caption" sx={{ color: '#D32F2F', fontWeight: 'bold', mr: 1.5, border: '1px solid #D32F2F', borderRadius: 1, px: 1, py: 0.5, bgcolor: '#FFEBEE' }}>
                                         No intentado
                                       </Typography>
                                    )}

                                    <Button 
                                      variant="contained" 
                                      size="small" 
                                      startIcon={<Visibility />} 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        // Si no se intentó, mostrar modal. Si se intentó, mostrar historial/resultado
                                        if (isExpired && !hasAttempt) {
                                          setOpenNotAttemptedDialog(true);
                                        } else if (hasAttempt) {
                                          handleOpenHistorial(a.id); 
                                        }
                                      }} 
                                      sx={{ mr: 1, background: 'linear-gradient(135deg, #F57C00 0%, #FF9800 100%)', color: 'white' }}
                                    >
                                      Ver Resultado
                                    </Button>
                                  </Box>
                                );
                              } else {
                                // SI ESTÁ VIGENTE -> REALIZAR
                                return (
                                  <Button 
                                    variant="contained" 
                                    size="small" 
                                    startIcon={<PlayArrow />} 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      router.push(`/actividades/${claseId}/realizar/${a.id}`); 
                                    }} 
                                    sx={{ mr: 1, background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)', color: 'white' }}
                                  >
                                    {a.intento?.estado === 'in_progress' ? 'Continuar' : 'Realizar'}
                                  </Button>
                                );
                              }
                           })()}

                           {/* PRÁCTICA */}
                           {a.tipo === 'practica' && (
                             a.intento?.estado === 'in_progress' ? (
                                <Button variant="contained" size="small" startIcon={<PlayArrow />} onClick={(e) => { e.stopPropagation(); router.push(`/actividades/${claseId}/realizar/${a.id}`); }} sx={{ bgcolor: '#1976D2', color: 'white' }}>Continuar</Button>
                             ) : (
                                a.intento?.estado === 'finished' ? (
                                  <>
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenHistorial(a.id); }} title="Ver historial" sx={{ color: '#8B4513', border: '1px solid #8B4513', mr: 1 }}>
                                      <History fontSize="small" />
                                    </IconButton>
                                    <Button variant="contained" size="small" startIcon={<RestartAlt />} onClick={(e) => { e.stopPropagation(); router.push(`/actividades/${claseId}/realizar/${a.id}`); }} sx={{ bgcolor: '#2E7D32', color: 'white' }}>Volver a Realizar</Button>
                                  </>
                                ) : (
                                  <Button variant="contained" size="small" startIcon={<PlayArrow />} onClick={(e) => { e.stopPropagation(); router.push(`/actividades/${claseId}/realizar/${a.id}`); }} sx={{ background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)', color: 'white' }}>Realizar</Button>
                                )
                             )
                           )}
                        </>
                      )}

                      {!a.is_visible && <Chip label="Oculta" color="warning" size="small" sx={{ ml: 1 }} />}
                      
                      {clase.isProfesor && (
                        <>
                          <Button variant="outlined" color="secondary" size="small" startIcon={<RateReview />} onClick={(e) => { e.stopPropagation(); router.push(`/actividades/${claseId}/corregir/${a.id}`); }} sx={{ mr: 1 }}>Corregir</Button>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setCrearForm({ nombre: a.nombre, descripcion: a.descripcion, tipo: a.tipo, fechaInicio: isoToDatetimeLocal(a.fecha_inicio), fechaFin: isoToDatetimeLocal(a.fecha_fin), isVisible: a.is_visible, ejercicioIds: a.ejercicios?.map((e: any) => e.id) || [], nuevosEjercicios: [] }); setEditingActividadId(a.id); setOpenCrearActividadDialog(true); }}><Edit /></IconButton>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setCrearEjercicioAttachActividadId(a.id); setOpenCrearEjercicioModal(true); }}><Add /></IconButton>
                          <IconButton size="small" onClick={async (e) => { e.stopPropagation(); try { await actividadService.editarActividad(claseId, a.id, { isVisible: !a.is_visible }); loadActividades(); } catch (err: any) { alert(err.response?.data?.message || 'Error'); } }}>{a.is_visible ? <Visibility /> : <VisibilityOff />}</IconButton>
                          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteTargetId(a.id); setOpenDeleteDialog(true); }}><Delete /></IconButton>
                        </>
                      )}
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            )}
          </TabPanel>
          
          {/* Tab de Profesores */}
          <TabPanel value={tabValue} index={2}>
            <List>
              {clase.profesores.map((profesor) => (
                <ListItem key={profesor.id}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#8B4513' }}>
                      {profesor.nombre[0]}{profesor.apellido[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${profesor.nombre} ${profesor.apellido}`}
                    secondary={profesor.email}
                  />
                </ListItem>
              ))}
            </List>
          </TabPanel>

          {/* Tab de Alumnos */}
          <TabPanel value={tabValue} index={3}>
            {clase.isProfesor && clase.alumnos.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Puedes promover a un alumno a profesor haciendo clic en "Promover a Profesor"
              </Alert>
            )}
            
            {clase.isProfesor && !clase.isPublico && clase.alumnos.length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Esta es una clase privada. Usa el botón "Matricular Alumno" para agregar alumnos manualmente.
              </Alert>
            )}
            
            <List>
              {clase.alumnos.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Person sx={{ fontSize: 60, color: '#DEB887', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    {!clase.isPublico && clase.isProfesor 
                      ? 'Aún no hay alumnos matriculados. Usa el botón "Matricular Alumno" para agregar.'
                      : 'Aún no hay alumnos en esta clase'}
                  </Typography>
                </Box>
              ) : (
                clase.alumnos.map((alumno) => (
                  <ListItem
                    key={alumno.id}
                    secondaryAction={
                      clase.isProfesor && (
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedUsuarioId(alumno.id);
                            setOpenPromoteDialog(true);
                          }}
                        >
                          Promover a Profesor
                        </Button>
                      )
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#D2691E' }}>
                        {alumno.nombre[0]}{alumno.apellido[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${alumno.nombre} ${alumno.apellido}`}
                      secondary={alumno.email}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </TabPanel>
        </Paper>

        {/* Dialog Crear/Editar Actividad */}
        <Dialog open={openCrearActividadDialog} onClose={() => setOpenCrearActividadDialog(false)} fullWidth maxWidth="md">
            <DialogTitle>{editingActividadId ? 'Editar Actividad' : 'Crear Actividad'}</DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {/* 1. Nombre */}
              <TextField 
                fullWidth 
                label="Nombre" 
                value={crearForm.nombre} 
                onChange={(e) => setCrearForm({...crearForm, nombre: e.target.value})} 
                sx={{ mb: 2, mt: 1 }} 
              />
              
              {/* 2. Descripción */}
              <TextField 
                fullWidth 
                label="Descripción" 
                multiline 
                rows={3} 
                value={crearForm.descripcion} 
                onChange={(e) => setCrearForm({...crearForm, descripcion: e.target.value})} 
                sx={{ mb: 2 }} 
              />

              {/* 3. Tipo de Actividad */}
              <TextField 
                select 
                fullWidth 
                label="Tipo" 
                value={crearForm.tipo} 
                onChange={(e) => setCrearForm({...crearForm, tipo: e.target.value})} 
                sx={{ mb: 2 }}
              >
                <MenuItem value="practica">Práctica</MenuItem>
                <MenuItem value="evaluacion">Evaluación</MenuItem>
              </TextField>

              {/* 4. Fechas (Solo si es Evaluación) */}
              {crearForm.tipo === 'evaluacion' && (
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField 
                    type="datetime-local" 
                    label="Inicio" 
                    InputLabelProps={{ shrink: true }} 
                    value={crearForm.fechaInicio} 
                    onChange={(e) => setCrearForm({...crearForm, fechaInicio: e.target.value})} 
                    fullWidth 
                  />
                  <TextField 
                    type="datetime-local" 
                    label="Fin" 
                    InputLabelProps={{ shrink: true }} 
                    value={crearForm.fechaFin} 
                    onChange={(e) => setCrearForm({...crearForm, fechaFin: e.target.value})} 
                    fullWidth 
                  />
                </Box>
              )}

              {/* 5. Lista de ejercicios nuevos a crear */}
              {!editingActividadId && crearForm.nuevosEjercicios.map((ne: any, idx: number) => (
                <Box key={idx} sx={{ border: '1px dashed #ccc', p: 2, mb: 2, borderRadius: 1 }}>
                  <TextField 
                    fullWidth 
                    label="Enunciado" 
                    value={ne.enunciado || ''} 
                    onChange={(e) => { 
                      const copy = [...crearForm.nuevosEjercicios]; 
                      copy[idx].enunciado = e.target.value; 
                      setCrearForm({...crearForm, nuevosEjercicios: copy}); 
                    }} 
                    sx={{ mb: 1 }} 
                  />
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField 
                      type="number" 
                      label="Pts" 
                      value={ne.puntos} 
                      onChange={(e) => { 
                        const copy = [...crearForm.nuevosEjercicios]; 
                        copy[idx].puntos = e.target.value; 
                        setCrearForm({...crearForm, nuevosEjercicios: copy}); 
                      }} 
                      sx={{ width: 100 }} 
                    />
                    <TextField 
                      select 
                      fullWidth 
                      label="Tipo" 
                      value={ne.tipo} 
                      onChange={(e) => { 
                        const copy = [...crearForm.nuevosEjercicios]; 
                        copy[idx].tipo = e.target.value; 
                        setCrearForm({...crearForm, nuevosEjercicios: copy}); 
                      }}
                    >
                       <MenuItem value="abierta">Abierta</MenuItem>
                       <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                       <MenuItem value="verdadero-falso">V/F</MenuItem>
                    </TextField>
                  </Box>
                  
                  {/* Editor de Opciones (si no es abierta) */}
                  {ne.tipo !== 'abierta' && (
                    <OptionsEditor 
                      opciones={ne.opciones || []} 
                      onChange={(opts) => { 
                        const copy = [...crearForm.nuevosEjercicios]; 
                        copy[idx].opciones = opts; 
                        setCrearForm({...crearForm, nuevosEjercicios: copy}); 
                      }} 
                    />
                  )}
                  
                  <Button 
                    color="error" 
                    size="small" 
                    onClick={() => { 
                      const copy = [...crearForm.nuevosEjercicios]; 
                      copy.splice(idx, 1); 
                      setCrearForm({...crearForm, nuevosEjercicios: copy}); 
                    }}
                  >
                    Quitar
                  </Button>
                </Box>
              ))}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenCrearActividadDialog(false)}>Cancelar</Button>
              <Button 
                variant="contained" 
                onClick={async () => {
                  try {
                     const payload = { ...crearForm } as any;

                     // Formatear fechas
                     if (payload.fechaInicio) payload.fechaInicio = new Date(payload.fechaInicio).toISOString();
                     if (payload.fechaFin) payload.fechaFin = new Date(payload.fechaFin).toISOString();
                     
                     // 1. Validaciones Generales
                     if (!payload.nombre || !payload.nombre.trim() || !payload.descripcion || !payload.descripcion.trim()) {
                        alert('Nombre y descripción son obligatorios');
                        return;
                     }
                     if (payload.tipo === 'evaluacion' && (!payload.fechaInicio || !payload.fechaFin)) {
                        alert('Las evaluaciones requieren fechaInicio y fechaFin');
                        return;
                     }

                     // 2. Normalizar y Validar Nuevos Ejercicios
                     if (payload.nuevosEjercicios && payload.nuevosEjercicios.length > 0) {
                        // Convertir puntos a número y parsear metadata si es string
                        payload.nuevosEjercicios = payload.nuevosEjercicios.map((e: any) => {
                           const copy: any = { ...e };
                           if (typeof copy.metadata === 'string' && copy.metadata.trim()) {
                              try { copy.metadata = JSON.parse(copy.metadata); } catch (err) { /* ignore */ }
                           }
                           copy.puntos = Number(copy.puntos) || 1;
                           return copy;
                        });

                        // Validar reglas de Multiple Choice y V/F
                        for (const e of payload.nuevosEjercicios) {
                           if (e.tipo === 'multiple-choice') {
                              const opciones = e.opciones || [];
                              if (opciones.length < 2) {
                                 alert('Multiple-choice requiere al menos 2 opciones');
                                 return;
                              }
                              if (!opciones.some((o: any) => o.is_correcta)) {
                                 alert('Multiple-choice requiere al menos una opción marcada como correcta');
                                 return;
                              }
                           }
                           if (e.tipo === 'verdadero-falso') {
                              const opts = e.opciones || [];
                              if (opts.length !== 2 || !opts.some((o:any) => o.is_correcta) || opts.filter((o:any) => o.is_correcta).length !== 1) {
                                 alert('Verdadero/Falso requiere 2 opciones y exactamente una marcada como correcta');
                                 return;
                              }
                           }
                        }
                     }

                     // 3. Enviar al Backend (Crear o Editar)
                     if (editingActividadId) {
                        // Filtrar payload para edición
                        const allowedKeys = ['nombre', 'descripcion', 'fechaInicio', 'fechaFin', 'isVisible', 'ejercicioIds', 'nuevosEjercicios'];
                        const updatePayload: any = {};
                        for (const k of allowedKeys) {
                           if ((payload as any)[k] !== undefined) updatePayload[k] = (payload as any)[k];
                        }
                        await actividadService.editarActividad(claseId, editingActividadId, updatePayload);
                     } else {
                        await actividadService.crearActividad(claseId, payload);
                     }

                     // 4. Limpieza
                     setOpenCrearActividadDialog(false); 
                     await loadActividades();
                     resetCrearForm();
                     setEditingActividadId(null);

                  } catch (e: any) { 
                    console.error(e);
                    alert(e.response?.data?.message || 'Error al guardar actividad'); 
                  }
                }}
                sx={{ 
                  bgcolor: '#8B4513', 
                  color: 'white',
                  '&:hover': { bgcolor: '#654321' } 
                }}
              >
                {editingActividadId ? 'Guardar' : 'Crear'}
              </Button>
            </DialogActions>
        </Dialog>

        {/* Eliminar Actividad */}
        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}><DialogTitle>Confirmar eliminación</DialogTitle><DialogActions><Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button><Button color="error" onClick={async () => { if (deleteTargetId) await actividadService.eliminarActividad(claseId, deleteTargetId); setOpenDeleteDialog(false); loadActividades(); }}>Eliminar</Button></DialogActions></Dialog>
        
        {/* Eliminar Comentario */}
        <Dialog open={openDeleteCommentDialog} onClose={() => setOpenDeleteCommentDialog(false)}><DialogTitle>Eliminar Comentario</DialogTitle><DialogContent><Typography>¿Estás seguro?</Typography></DialogContent><DialogActions><Button onClick={() => setOpenDeleteCommentDialog(false)}>Cancelar</Button><Button color="error" onClick={handleConfirmDeleteComment}>Eliminar</Button></DialogActions></Dialog>
        
        {/* Eliminar Anuncio */}
        <Dialog open={openDeleteAnuncioDialog} onClose={() => setOpenDeleteAnuncioDialog(false)}><DialogTitle>Eliminar Anuncio</DialogTitle><DialogActions><Button onClick={() => setOpenDeleteAnuncioDialog(false)}>Cancelar</Button><Button color="error" onClick={async () => { if (selectedAnuncio) await anuncioService.deleteAnuncio(selectedAnuncio.id); setOpenDeleteAnuncioDialog(false); loadAnuncios(); }}>Eliminar</Button></DialogActions></Dialog>

        {/* Crear/Editar Anuncio */}
        <Dialog open={openAnuncioDialog} onClose={handleCloseAnuncioDialog} fullWidth><DialogTitle>{editingAnuncio ? 'Editar' : 'Nuevo'} Anuncio</DialogTitle><DialogContent sx={{ pt: 2 }}><TextField fullWidth label="Título" value={anuncioFormData.titulo} onChange={(e) => setAnuncioFormData({...anuncioFormData, titulo: e.target.value})} sx={{ mb: 2 }} /><TextField fullWidth multiline rows={4} label="Descripción" value={anuncioFormData.descripcion} onChange={(e) => setAnuncioFormData({...anuncioFormData, descripcion: e.target.value})} /></DialogContent><DialogActions><Button onClick={handleCloseAnuncioDialog}>Cancelar</Button><Button variant="contained" onClick={handleSubmitAnuncio} disabled={submittingAnuncio}>{editingAnuncio ? 'Guardar' : 'Publicar'}</Button></DialogActions></Dialog>

        {/* Promover/Matricular/Salir */}
        <Dialog open={openPromoteDialog} onClose={() => setOpenPromoteDialog(false)}><DialogTitle>Promover</DialogTitle><DialogActions><Button onClick={() => setOpenPromoteDialog(false)}>Cancelar</Button><Button onClick={handlePromoverProfesor}>Confirmar</Button></DialogActions></Dialog>
        <MatricularAlumnoDialog open={openMatricularDialog} onClose={() => setOpenMatricularDialog(false)} onMatricular={handleMatricularAlumno} claseId={claseId} />
        <Dialog open={openSalirDialog} onClose={() => setOpenSalirDialog(false)}><DialogTitle>Salir</DialogTitle><DialogActions><Button onClick={() => setOpenSalirDialog(false)}>Cancelar</Button><Button color="error" onClick={async () => { await claseService.salirDeClase(claseId); router.push('/dashboard'); }}>Salir</Button></DialogActions></Dialog>
        
        {/* Crear Ejercicio Rápido */}
        <Dialog open={openCrearEjercicioModal} onClose={() => setOpenCrearEjercicioModal(false)} fullWidth maxWidth="md"><DialogTitle>Crear Ejercicio</DialogTitle><DialogContent><EjercicioForm onSubmit={handleCrearEjercicioSubmit} submitButtonText="Crear y Agregar" loading={crearEjercicioLoading} error={crearEjercicioError} onCancel={() => setOpenCrearEjercicioModal(false)} /></DialogContent></Dialog>
        
        {/* Ver Actividad Inline */}
        <Dialog open={openVerActividad} onClose={() => setOpenVerActividad(false)} fullWidth>
          <DialogTitle>Ver Actividad</DialogTitle>
          <DialogContent>
            {!verActividad ? <Typography>No encontrada</Typography> : <Box><Typography variant="h6">{verActividad.nombre}</Typography><Typography color="text.secondary">{verActividad.descripcion}</Typography></Box>}
          </DialogContent>
          <DialogActions><Button onClick={() => setOpenVerActividad(false)}>Cerrar</Button></DialogActions>
        </Dialog>

      {/* Dialog de Historial */}
        <Dialog 
          open={openHistorialDialog} 
          onClose={() => setOpenHistorialDialog(false)} 
          maxWidth="xs" 
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 600 }}>
            Historial de Intentos
          </DialogTitle>
          
          <DialogContent sx={{ pt: 2, px: 0 }}>
            {historialLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={30} sx={{ color: '#8B4513' }} />
              </Box>
            ) : (
              historialData.length === 0 ? (
                <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay intentos registrados para esta actividad.
                  </Typography>
                </Box>
              ) : (
                <List sx={{ pt: 0 }}>
                  {historialData.map((intento: any, idx: number) => (
                    <ListItemButton 
                      key={intento.id} 
                      divider 
                      onClick={() => {
                        // Navegación al modo revisión
                        // IMPORTANTE: 'historialActividadId' debe tener el ID de la actividad actual
                        router.push(`/actividades/${claseId}/realizar/${historialActividadId}?mode=revision&intentoId=${intento.id}`);
                        setOpenHistorialDialog(false);
                      }}
                      sx={{ 
                        py: 2,
                        '&:hover': { bgcolor: 'rgba(139, 69, 19, 0.04)' }
                      }}
                    >
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#3E2723' }}>
                              Intento #{idx + 1}
                            </Typography>
                            <Chip 
                              label={`${intento.puntaje ?? 0} pts`} 
                              size="small" 
                              sx={{ 
                                bgcolor: '#EFEBE9', 
                                color: '#5D4037', 
                                fontWeight: 'bold',
                                height: 24 
                              }} 
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {new Date(intento.finished_at || intento.created_at).toLocaleString()}
                          </Typography>
                        }
                      />
                      {/* Icono o indicador visual de "Ir" */}
                      <Box sx={{ ml: 1, color: '#8B4513', opacity: 0.6 }}>
                        <Visibility fontSize="small" />
                      </Box>
                    </ListItemButton>
                  ))}
                </List>
              )
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
            <Button 
              onClick={() => setOpenHistorialDialog(false)}
              sx={{ color: '#5D4037' }}
            >
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>


        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}><MenuItem onClick={() => { if (selectedAnuncio) handleOpenAnuncioDialog(selectedAnuncio); handleMenuClose(); }}><Edit sx={{ mr: 1 }} /> Editar</MenuItem><MenuItem onClick={handleDeleteAnuncio}><Delete sx={{ mr: 1 }} /> Eliminar</MenuItem></Menu>
      
        {/* DIÁLOGO: ACTIVIDAD VENCIDA */}
        <Dialog open={openExpiredDialog} onClose={() => setOpenExpiredDialog(false)}>
          <DialogTitle sx={{ color: '#D32F2F', display: 'flex', alignItems: 'center', gap: 1 }}>
             <EventBusy /> Actividad Finalizada
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ mt: 1 }}>
              Esta evaluación ya no está disponible para realizar.
            </Typography>
            {expiredActivityDate && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, borderLeft: '4px solid #D32F2F' }}>
                <strong>Cerró el:</strong> {new Date(expiredActivityDate).toLocaleString()}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenExpiredDialog(false)} sx={{ color: '#5D4037' }}>Cerrar</Button>
          </DialogActions>
        </Dialog>

      {/* DIÁLOGO: ACTIVIDAD NO INTENTADA (VENCIDA) */}
      <Dialog open={openNotAttemptedDialog} onClose={() => setOpenNotAttemptedDialog(false)}>
        <DialogTitle sx={{ color: '#D32F2F', display: 'flex', alignItems: 'center', gap: 1 }}>
           <EventBusy /> Actividad No Realizada
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1 }}>
            El plazo para realizar esta evaluación ha finalizado y no se registraron intentos.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Ya no es posible visualizarla ni completarla.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNotAttemptedDialog(false)} sx={{ color: '#5D4037' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      </Container>
    </Box>
  );
}