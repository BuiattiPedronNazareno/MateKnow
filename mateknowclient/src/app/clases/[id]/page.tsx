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
} from '@mui/icons-material';
import { claseService, ClaseDetalle } from '@/app/services/claseService';
import { authService } from '@/app/services/authService';
import { actividadService } from '@/app/services/actividadService';
import MatricularAlumnoDialog from '@/app/components/MatricularAlumnoDialog';
import EjercicioForm from '@/app/components/EjercicioForm';
import { ejercicioService } from '@/app/services/ejercicioService';
import OptionsEditor from '@/app/actividades/[claseId]/components/OptionsEditor';
import { anuncioService, Anuncio, CreateAnuncioData, Comentario } from '@/app/services/anuncioService';

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

  // --- ESTADOS PARA COMENTARIOS ---
  const [expandedAnuncioId, setExpandedAnuncioId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<{ [key: string]: Comentario[] }>({});
  const [paginationMap, setPaginationMap] = useState<{ [key: string]: { page: number; lastPage: number; total: number } }>({});
  const [loadingComments, setLoadingComments] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  
  // Estados para el modal de eliminar comentario
  const [openDeleteCommentDialog, setOpenDeleteCommentDialog] = useState(false);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<{ anuncioId: string; comentarioId: string } | null>(null);

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
    loadClase();
    loadActividades();
      if (typeof window !== 'undefined') {
        const open = new URLSearchParams(window.location.search).get('openCreate');
        if (open === 'true') openCreateActivDialog();
      }
    loadAnuncios();
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

  const loadAnuncios = async () => {
    try {
      setLoadingAnuncios(true);
      const response = await anuncioService.getAnunciosByClase(claseId);
      setAnuncios(response.anuncios);
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                  sx={{
                    background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                  }}
                >
                  Nuevo Anuncio
                </Button>
              </Box>
            )}

            {loadingAnuncios ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : anuncios.length === 0 ? (
              <Card sx={{ textAlign: 'center', py: 8 }}>
                <Campaign sx={{ fontSize: 80, color: '#DEB887', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No hay anuncios aún
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {clase.isProfesor
                    ? 'Crea el primer anuncio para mantener informados a tus alumnos'
                    : 'El profesor aún no ha publicado anuncios'}
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
                    <CardContent sx={{ pt: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, gap: 1 }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 600,
                            color: '#3E2723',
                            flex: 1,
                          }}
                        >
                          {anuncio.titulo}
                        </Typography>
                        {clase.isProfesor && (
                          <IconButton 
                            size="small" 
                            onClick={(e: React.MouseEvent<HTMLElement>) => handleMenuOpen(e, anuncio)}
                            sx={{
                              color: '#8B4513',
                              ml: 'auto',
                              display: anuncio.autor.id === user?.id ? 'flex' : 'none',
                            }}
                          >
                            <MoreVert />
                          </IconButton>
                        )}
                      </Box>

                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: '#5D4037',
                          mb: 2, 
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6,
                        }}
                      >
                        {anuncio.descripcion}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: '#8B4513',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {anuncio.autor.nombre[0]}{anuncio.autor.apellido[0]}
                        </Avatar>
                        <Typography variant="caption" sx={{ color: '#8B4513', fontWeight: 500 }}>
                          {anuncio.autor.nombre} {anuncio.autor.apellido} • {formatDate(anuncio.fechaPublicacion)}
                        </Typography>
                      </Box>

                      {/* --- SECCIÓN DE COMENTARIOS --- */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <Button 
                          size="small" 
                          startIcon={<CommentIcon />}
                          onClick={() => handleToggleComments(anuncio.id)}
                          sx={{ color: '#8B4513' }}
                        >
                          {expandedAnuncioId === anuncio.id ? 'Ocultar consultas' : 'Ver consultas'}
                        </Button>
                      </Box>

                      <Collapse in={expandedAnuncioId === anuncio.id} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 2, pl: 2, pr: 2, pb: 2, bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }}>
                          
                          {loadingComments === anuncio.id ? (
                            <CircularProgress size={20} sx={{ display: 'block', mx: 'auto', my: 2 }} />
                          ) : (commentsMap[anuncio.id] || []).length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                              No hay consultas aún. ¡Sé el primero!
                            </Typography>
                          ) : (
                            <>
                              <List dense>
                                {(commentsMap[anuncio.id] || []).map((comentario) => (
                                  <ListItem 
                                    key={comentario.id}
                                    alignItems="flex-start"
                                    sx={{ 
                                      bgcolor: 'white', 
                                      mb: 1, 
                                      borderRadius: 1, 
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)' 
                                    }}
                                    secondaryAction={
                                      clase.isProfesor && (
                                        <IconButton edge="end" size="small" onClick={() => handleDeleteComment(anuncio.id, comentario.id)}>
                                          <Delete fontSize="small" color="action" />
                                        </IconButton>
                                      )
                                    }
                                  >
                                    <ListItemAvatar sx={{ minWidth: 40 }}>
                                      <Avatar 
                                        sx={{ width: 24, height: 24, fontSize: '0.6rem', bgcolor: '#A0522D' }}
                                      >
                                        {comentario.autor.nombre[0]}
                                      </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                      primary={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            {comentario.autor.nombre} {comentario.autor.apellido}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {formatDate(comentario.createdAt)}
                                          </Typography>
                                        </Box>
                                      }
                                      secondary={
                                        <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                                          {comentario.contenido}
                                        </Typography>
                                      }
                                    />
                                  </ListItem>
                                ))}
                              </List>

                              {/* CONTROLES DE PAGINACIÓN */}
                              {paginationMap[anuncio.id] && paginationMap[anuncio.id].lastPage > 1 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 1, mb: 1 }}>
                                  <IconButton 
                                    size="small" 
                                    disabled={paginationMap[anuncio.id].page === 1}
                                    onClick={() => handleChangePage(anuncio.id, paginationMap[anuncio.id].page - 1)}
                                  >
                                    <KeyboardArrowLeft />
                                  </IconButton>
                                  
                                  <Typography variant="caption" color="text.secondary">
                                    Página {paginationMap[anuncio.id].page} de {paginationMap[anuncio.id].lastPage}
                                  </Typography>

                                  <IconButton 
                                    size="small" 
                                    disabled={paginationMap[anuncio.id].page === paginationMap[anuncio.id].lastPage}
                                    onClick={() => handleChangePage(anuncio.id, paginationMap[anuncio.id].page + 1)}
                                  >
                                    <KeyboardArrowRight />
                                  </IconButton>
                                </Box>
                              )}
                            </>
                          )}

                          {/* Input Nuevo Comentario */}
                          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <TextField
                              fullWidth
                              size="small"
                              placeholder="Escribe una consulta..."
                              value={newCommentText}
                              onChange={(e) => setNewCommentText(e.target.value)}
                              onKeyPress={(e) => { if (e.key === 'Enter') handleSendComment(anuncio.id); }}
                              sx={{ bgcolor: 'white' }}
                            />
                            <IconButton 
                              onClick={() => handleSendComment(anuncio.id)}
                              disabled={!newCommentText.trim()}
                              sx={{ 
                                bgcolor: '#8B4513', 
                                color: 'white', 
                                width: 40,
                                height: 40,
                                '&:hover': { 
                                  bgcolor: '#5D4037' 
                                },
                                '&.Mui-disabled': {
                                  bgcolor: 'rgba(0, 0, 0, 0.12)',
                                  color: 'rgba(0, 0, 0, 0.26)'
                                }
                              }}
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </Box>

                        </Box>
                      </Collapse>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </TabPanel>

          {/* Tab de Profesores */}
          <TabPanel value={tabValue} index={1}>
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
          <TabPanel value={tabValue} index={2}>
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

        {/* Sección Actividades */}
        <Paper sx={{ p: 3, mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Actividades</Typography>
            <Box>
              {clase.isProfesor && (
                <Button
                  variant="contained"
                  onClick={() => openCreateActivDialog()}
                  sx={{
                    background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                    color: 'white'
                  }}
                >
                  Crear Actividad
                </Button>
              )}
            </Box>
          </Box>

          {loadingActividades ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : actividades.length === 0 ? (
            <Typography color="text.secondary">No hay actividades aún.</Typography>
          ) : (
            <List>
              {actividades.map((a) => (
                <ListItem key={a.id} disablePadding sx={{ borderBottom: '1px solid #eee', ...(a.is_visible ? {} : { backgroundColor: 'rgba(255,152,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }) }}>
                  <ListItemButton onClick={() => router.push(`/actividades/${claseId}/ver/${a.id}`)} sx={{ cursor: 'pointer' }}>
                    <ListItemText
                      primary={a.nombre}
                      secondary={a.descripcion}
                      sx={!a.is_visible ? { color: 'warning.main' } : {}}
                    />
                  <Box sx={{ ml: 2, textAlign: 'right' }}>
                    {a.tipo === 'evaluacion' && (
                      <Chip label="Evaluación" size="small" sx={{ mr: 1 }} />
                    )}
                    {!a.is_visible && <Chip label="Oculta" color="warning" size="small" sx={{ ml: 1 }} />}
                    {clase.isProfesor && (
                      <IconButton size="small" aria-label="edit-activity" onClick={async (e: React.MouseEvent<HTMLElement>) => {
                        e.stopPropagation();
                        const res = await actividadService.listarActividades(claseId);
                        const actividad = (res.actividades || []).find((x: any) => x.id === a.id);
                        if (!actividad) {
                          alert('Actividad no encontrada');
                          return;
                        }
                        setCrearForm({
                          nombre: actividad.nombre,
                          descripcion: actividad.descripcion,
                          tipo: actividad.tipo || 'practica',
                          fechaInicio: actividad.fecha_inicio ? isoToDatetimeLocal(actividad.fecha_inicio) : '',
                          fechaFin: actividad.fecha_fin ? isoToDatetimeLocal(actividad.fecha_fin) : '',
                          isVisible: !!actividad.is_visible,
                          ejercicioIds: (actividad.ejercicios || []).map((e: any) => e.id),
                          nuevosEjercicios: []
                        });
                        setEditingActividadId(actividad.id);
                        setOpenCrearActividadDialog(true);
                      }} sx={{ ml: 1 }}>
                        <Edit />
                      </IconButton>
                    )}
                    {clase.isProfesor && (
                      <IconButton size="small" aria-label="agregar-ejercicio" onClick={(e: React.MouseEvent<HTMLElement>) => { e.stopPropagation(); setCrearEjercicioAttachActividadId(a.id); setOpenCrearEjercicioModal(true); }} sx={{ ml: 1 }}>
                        <Add />
                      </IconButton>
                    )}
                    {clase.isProfesor && (
                      <IconButton size="small" aria-label="toggle-visibility" onClick={async (e: React.MouseEvent<HTMLElement>) => { e.stopPropagation(); try { await actividadService.editarActividad(claseId, a.id, { isVisible: !a.is_visible }); await loadActividades(); } catch (err: any) { alert(err.response?.data?.message || 'Error toggling visibility'); } }} sx={{ ml: 1 }}>
                        {a.is_visible ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    )}
                    {clase.isProfesor && (
                      <IconButton size="small" aria-label="delete-activity" onClick={(e: React.MouseEvent<HTMLElement>) => { e.stopPropagation(); setDeleteTargetId(a.id); setOpenDeleteDialog(true); }} sx={{ ml: 1 }} color="error">
                        <Delete />
                      </IconButton>
                    )}
                  </Box>
                </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {/* Dialog Crear Actividad */}
        <Dialog open={openCrearActividadDialog} onClose={() => setOpenCrearActividadDialog(false)} fullWidth>
            <DialogTitle>{editingActividadId ? 'Editar Actividad' : 'Crear Actividad'}</DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <TextField fullWidth label="Nombre" value={crearForm.nombre} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCrearForm({...crearForm, nombre: e.target.value})} sx={{ mb: 2, mt: 1 }} InputProps={{ sx: { paddingTop: '10px' } }} />
            <TextField fullWidth label="Descripción" multiline rows={4} value={crearForm.descripcion} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCrearForm({...crearForm, descripcion: e.target.value})} sx={{ mb: 2 }} />

            <TextField select fullWidth label="Tipo" value={crearForm.tipo} onChange={(e: any) => setCrearForm({...crearForm, tipo: e.target.value as any})} sx={{ mb: 2 }}>
              <MenuItem value="practica">Práctica</MenuItem>
              <MenuItem value="evaluacion">Evaluación</MenuItem>
            </TextField>

            {crearForm.tipo === 'evaluacion' && (
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField type="datetime-local" label="Fecha Inicio" InputLabelProps={{ shrink: true }} value={crearForm.fechaInicio} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrearForm({...crearForm, fechaInicio: e.target.value})} />
                <TextField type="datetime-local" label="Fecha Fin" InputLabelProps={{ shrink: true }} value={crearForm.fechaFin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrearForm({...crearForm, fechaFin: e.target.value})} />
              </Box>
            )}

            <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
              <InputLabel id="ejercicios-label">Ejercicios (seleccionar)</InputLabel>
              <Select
                labelId="ejercicios-label"
                multiple
                value={crearForm.ejercicioIds}
                onChange={(e: SelectChangeEvent<string[]>) => setCrearForm({...crearForm, ejercicioIds: e.target.value as string[]})}
                renderValue={(selected: any) => (selected as string[]).map(id => {
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

            {!editingActividadId && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Button startIcon={<Add />} size="small" onClick={() => setCrearForm({...crearForm, nuevosEjercicios: [...crearForm.nuevosEjercicios, { tipo: 'abierta', titulo: '', enunciado: '', puntos: 1, opciones: [], metadata: '' }]})}>Agregar ejercicio</Button>
              </Box>
            )}
              <Typography variant="caption" color="text.secondary">Agrega uno o varios ejercicios y se asociarán a la actividad</Typography>

            {!editingActividadId && crearForm.nuevosEjercicios.length > 0 && (
              <Box sx={{ mb: 2 }}>
                {crearForm.nuevosEjercicios.map((ne, idx) => (
                  <Box key={idx} sx={{ border: '1px dashed #DDD', p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
                      <TextField fullWidth label={`Título del ejercicio #${idx + 1}`} value={ne.titulo || ''} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCrearForm({...crearForm, nuevosEjercicios: crearForm.nuevosEjercicios.map((x, i) => i === idx ? { ...x, titulo: e.target.value } : x) })} />
                      <Button color="error" onClick={() => setCrearForm({...crearForm, nuevosEjercicios: crearForm.nuevosEjercicios.filter((_, i) => i !== idx)})}>Eliminar</Button>
                    </Box>
                    <TextField fullWidth label="Enunciado" multiline rows={3} value={ne.enunciado || ''} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCrearForm({...crearForm, nuevosEjercicios: crearForm.nuevosEjercicios.map((x,i) => i===idx?{...x, enunciado: e.target.value}:x) })} sx={{ mb: 1 }} />
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField type="number" label="Puntos" value={ne.puntos ?? 1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrearForm({...crearForm, nuevosEjercicios: crearForm.nuevosEjercicios.map((x,i) => i===idx?{...x, puntos: Number(e.target.value) || 1}:x) })} sx={{ width: 120 }} />
                      <FormControl fullWidth>
                        <InputLabel id={`tipo-ej-${idx}`}>Tipo de ejercicio</InputLabel>
                        <Select labelId={`tipo-ej-${idx}`} value={ne.tipo || 'abierta'} label="Tipo de ejercicio" onChange={(e: SelectChangeEvent<string>) => setCrearForm({...crearForm, nuevosEjercicios: crearForm.nuevosEjercicios.map((x,i) => i===idx?{...x, tipo: e.target.value as any}:x) })} MenuProps={{ disablePortal: true }}>
                          <MenuItem value="abierta">Abierta</MenuItem>
                          <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                          <MenuItem value="verdadero-falso">Verdadero/Falso</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    {ne.tipo === 'multiple-choice' && (
                      <OptionsEditor opciones={ne.opciones || []} onChange={(opts) => setCrearForm({...crearForm, nuevosEjercicios: crearForm.nuevosEjercicios.map((x,i) => i === idx ? {...x, opciones: opts} : x) })} />
                    )}

                    {ne.tipo === 'verdadero-falso' && (
                      <RadioGroup
                        value={(ne.opciones || []).findIndex((o:any) => o.is_correcta) === 0 ? 'verdadero' : 'falso'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const isTrue = e.target.value === 'verdadero';
                          const nextOpts = [
                            { texto: 'Verdadero', is_correcta: isTrue },
                            { texto: 'Falso', is_correcta: !isTrue },
                          ];
                          setCrearForm({ ...crearForm, nuevosEjercicios: crearForm.nuevosEjercicios.map((x,i) => i === idx ? { ...x, opciones: nextOpts } : x ) });
                        }}
                      >
                        <FormControlLabel value="verdadero" control={<Radio />} label="Verdadero" />
                        <FormControlLabel value="falso" control={<Radio />} label="Falso" />
                      </RadioGroup>
                    )}

                    <TextField fullWidth label="Metadata (JSON opcional)" value={typeof ne.metadata === 'object' ? JSON.stringify(ne.metadata) : (ne.metadata || '')} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCrearForm({...crearForm, nuevosEjercicios: crearForm.nuevosEjercicios.map((x,i) => i===idx?{...x, metadata: e.target.value}:x) })} multiline rows={3} />
                  </Box>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCrearActividadDialog(false)}>Cancelar</Button>
            <Button variant="contained" onClick={async () => {
              try {
                const payload = { ...crearForm } as any;
                if (payload.fechaInicio) payload.fechaInicio = new Date(payload.fechaInicio).toISOString();
                if (payload.fechaFin) payload.fechaFin = new Date(payload.fechaFin).toISOString();
                if (!payload.nombre || !payload.nombre.trim() || !payload.descripcion || !payload.descripcion.trim()) {
                  alert('Nombre y descripción son obligatorios');
                  return;
                }
                if (payload.tipo === 'evaluacion' && (!payload.fechaInicio || !payload.fechaFin)) {
                  alert('Las evaluaciones requieren fechaInicio y fechaFin');
                  return;
                }

                if (payload.nuevosEjercicios && payload.nuevosEjercicios.length > 0) {
                  payload.nuevosEjercicios = payload.nuevosEjercicios.map((e: any) => {
                    const copy: any = { ...e };
                    if (typeof copy.metadata === 'string' && copy.metadata.trim()) {
                      try { copy.metadata = JSON.parse(copy.metadata); } catch (err) { /* keep string */ }
                    }
                    copy.puntos = Number(copy.puntos) || 1;
                    return copy;
                  });
                }

                if (payload.nuevosEjercicios && payload.nuevosEjercicios.length > 0) {
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

                if (editingActividadId) {
                  const allowedKeys = ['nombre', 'descripcion', 'fechaInicio', 'fechaFin', 'isVisible', 'ejercicioIds'];
                  const updatePayload: any = {};
                  for (const k of allowedKeys) {
                    if ((payload as any)[k] !== undefined) updatePayload[k] = (payload as any)[k];
                  }
                  setOpenCrearActividadDialog(false);
                  await actividadService.editarActividad(claseId, editingActividadId, updatePayload);
                } else {
                  setOpenCrearActividadDialog(false);
                  await actividadService.crearActividad(claseId, payload);
                }
                await loadActividades();
                resetCrearForm();
                setEditingActividadId(null);
              } catch (err: any) {
                console.error(err);
                alert(err.response?.data?.message || 'Error al crear actividad');
              }
            }} sx={{ background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)', color: 'white' }}>{editingActividadId ? 'Guardar' : 'Crear'}</Button>
          </DialogActions>
        </Dialog>

        {/* Mini modal para confirmar eliminación de actividad */}
        <Dialog open={openDeleteDialog} onClose={() => { setOpenDeleteDialog(false); setDeleteTargetId(null); }} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            <Typography>¿Deseas eliminar esta actividad y sus registros? Esta acción no se puede deshacer.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpenDeleteDialog(false); setDeleteTargetId(null); }}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={async () => {
              const idToDelete = deleteTargetId;
              setOpenDeleteDialog(false);
              setDeleteTargetId(null);
              if (!idToDelete) return;
              try {
                await actividadService.eliminarActividad(claseId, idToDelete);
                await loadActividades();
              } catch (err: any) {
                setError(err.response?.data?.message || 'Error al eliminar actividad');
              }
            }}>Eliminar</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Ver Actividad inline */}
        <Dialog open={openVerActividad} onClose={() => setOpenVerActividad(false)} fullWidth>
          <DialogTitle>Ver Actividad</DialogTitle>
          <DialogContent>
            {!verActividad ? <Typography>Actividad no encontrada</Typography> : (
              <Box>
                <Typography variant="h6">{verActividad.nombre}</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>{verActividad.descripcion}</Typography>
                {verActividad.ejercicios && verActividad.ejercicios.length > 0 ? (
                  <List>
                    {verActividad.ejercicios.map((ej: any) => (
                      <ListItem key={ej.id} sx={!verActividad.is_visible ? { backgroundColor: 'rgba(255,152,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}}>
                        <ListItemText
                          primary={ej.titulo || ej.enunciado}
                          secondary={ej.puntos ? `${ej.puntos} pts` : '1 pto'}
                          sx={!verActividad.is_visible ? { color: 'warning.main' } : {}}
                        />
                        {!verActividad.is_visible && (
                          <Chip label="Oculta" color="warning" size="small" sx={{ ml: 1 }} />
                        )}
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">Aún no hay ejercicios asociados.</Typography>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenVerActividad(false)}>Cerrar</Button>
            <Button variant="contained" onClick={() => {
              if (verActividad) router.push(`/actividades/${claseId}/ver/${verActividad.id}`);
              setOpenVerActividad(false);
            }}>Ir a actividad</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para confirmar promoción a profesor */}
        <Dialog open={openPromoteDialog} onClose={() => setOpenPromoteDialog(false)}>
          <DialogTitle>Promover a Profesor</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Estás seguro de que quieres promover a este alumno a profesor?
              Tendrá los mismos permisos que tú para gestionar esta clase.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenPromoteDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePromoverProfesor}
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
              }}
            >
              Promover
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para matricular alumno manualmente */}
        <MatricularAlumnoDialog
          open={openMatricularDialog}
          onClose={() => setOpenMatricularDialog(false)}
          onMatricular={handleMatricularAlumno}
          claseId={claseId}
        />

        {/* Dialog para confirmar salir de clase */}
        <Dialog open={openSalirDialog} onClose={() => setOpenSalirDialog(false)}>
          <DialogTitle>Salir de Clase</DialogTitle>
          <DialogContent>
            <Typography>¿Estás seguro de que quieres salir de esta clase? Perderás acceso como alumno.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenSalirDialog(false)}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={async () => {
              try {
                await claseService.salirDeClase(claseId);
                router.push('/dashboard');
              } catch (err: any) {
                setError(err.response?.data?.message || 'Error al salir de la clase');
              } finally {
                setOpenSalirDialog(false);
              }
            }}>Salir</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para confirmar eliminación de anuncio */}
        <Dialog open={openDeleteAnuncioDialog} onClose={() => setOpenDeleteAnuncioDialog(false)}>
          <DialogTitle>Eliminar anuncio</DialogTitle>
          <DialogContent>
            <Typography>¿Deseas eliminar este anuncio? Esta acción no se puede deshacer.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteAnuncioDialog(false)}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={async () => {
              const current = selectedAnuncio;
              setOpenDeleteAnuncioDialog(false);
              if (!current) return;
              try {
                await anuncioService.deleteAnuncio(current.id);
                await loadAnuncios();
              } catch (err: any) {
                setError(err.response?.data?.message || 'Error al eliminar anuncio');
              }
            }}>Eliminar</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para crear/editar anuncio */}
        <Dialog 
          open={openAnuncioDialog} 
          onClose={handleCloseAnuncioDialog} 
          maxWidth="md" 
          fullWidth
          disableRestoreFocus
        >
          <form onSubmit={handleSubmitAnuncio}>
            <DialogTitle>
              {editingAnuncio ? 'Editar Anuncio' : 'Nuevo Anuncio'}
            </DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="Título"
                value={anuncioFormData.titulo}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAnuncioFormData({ ...anuncioFormData, titulo: e.target.value })}
                required
                autoFocus
                disabled={submittingAnuncio}
                sx={{ mb: 2, mt: 1 }}
                inputProps={{ maxLength: 200 }}
                helperText={`${anuncioFormData.titulo.length}/200 caracteres`}
              />

              <TextField
                fullWidth
                label="Descripción"
                value={anuncioFormData.descripcion}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAnuncioFormData({ ...anuncioFormData, descripcion: e.target.value })}
                required
                multiline
                rows={6}
                disabled={submittingAnuncio}
                helperText="Escribe el contenido del anuncio"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseAnuncioDialog} disabled={submittingAnuncio}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submittingAnuncio}
                sx={{
                  background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                }}
              >
                {submittingAnuncio ? <CircularProgress size={24} /> : editingAnuncio ? 'Guardar' : 'Publicar'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Dialog para crear ejercicio rápido */}
        <Dialog open={openCrearEjercicioModal} onClose={() => { setOpenCrearEjercicioModal(false); setCrearEjercicioAttachActividadId(null); }} fullWidth maxWidth="md">
          <DialogTitle>Crear ejercicio</DialogTitle>
          <DialogContent>
            <EjercicioForm
              onSubmit={handleCrearEjercicioSubmit}
              submitButtonText="Crear y agregar"
              loading={crearEjercicioLoading}
              error={crearEjercicioError}
              onCancel={() => { setOpenCrearEjercicioModal(false); setCrearEjercicioAttachActividadId(null); }}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog para confirmar eliminación de comentario (Instantáneo) */}
        <Dialog open={openDeleteCommentDialog} onClose={() => setOpenDeleteCommentDialog(false)}>
          <DialogTitle>Eliminar comentario</DialogTitle>
          <DialogContent>
            <Typography>¿Deseas eliminar este comentario? Esta acción no se puede deshacer.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteCommentDialog(false)}>Cancelar</Button>
            <Button 
              color="error" 
              variant="contained" 
              onClick={handleConfirmDeleteComment}
            >
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Menú contextual para anuncios */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem
            onClick={() => {
              if (selectedAnuncio) handleOpenAnuncioDialog(selectedAnuncio);
              handleMenuClose();
            }}
          >
            <Edit sx={{ mr: 1 }} /> Editar
          </MenuItem>
          <MenuItem onClick={handleDeleteAnuncio}>
            <Delete sx={{ mr: 1 }} /> Eliminar
          </MenuItem>
        </Menu>
      </Container>
    </Box>
  );
}