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
  MoreVert,
  Edit,
  Delete,
} from '@mui/icons-material';
import { claseService, ClaseDetalle } from '@/app/services/claseService';
import { authService } from '@/app/services/authService';
import { actividadService } from '@/app/services/actividadService';
import MatricularAlumnoDialog from '@/app/components/MatricularAlumnoDialog';
import { anuncioService, Anuncio, CreateAnuncioData } from '@/app/services/anuncioService';

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
      // No mostrar bloqueo crítico; registrar en consola y mostrar alert por arriba si se desea
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
    // kept for direct call if needed; prefer opening the non-blocking dialog
    setOpenSalirDialog(true);
    return;
    
    try {
      await claseService.salirDeClase(claseId);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al salir de la clase');
    }
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
    // Open the modal confirm instead of native confirm
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
            onChange={(e, newValue) => setTabValue(newValue)}
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
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '6px 6px 12px rgba(0,0,0,0.2)',
                      },
                      '&::before': {
                        content: '"📌"',
                        position: 'absolute',
                        top: -10,
                        right: 20,
                        fontSize: '24px',
                        zIndex: 1,
                      }
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
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            hyphens: 'auto',
                          }}
                        >
                          {anuncio.titulo}
                        </Typography>
                        {clase.isProfesor && (
                          <IconButton 
                            size="small" 
                            onClick={(e) => handleMenuOpen(e, anuncio)}
                            sx={{
                              color: '#8B4513',
                              flexShrink: 0,
                              ml: 'auto',
                              display: anuncio.autor.id === user?.id ? 'flex' : 'none',
                              '&:hover': {
                                background: 'rgba(139, 69, 19, 0.1)',
                              }
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
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
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
                <ListItem key={a.id} sx={{ borderBottom: '1px solid #eee', ...(a.is_visible ? {} : { backgroundColor: 'rgba(255,152,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }) }}>
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
                    <Button size="small" onClick={async () => {
                      // Open Ver modal inline to avoid a 404 redirect
                      try {
                        // Load activity details from service
                        const res = await actividadService.listarActividades(claseId);
                        const actividad = (res.actividades || []).find((x: any) => x.id === a.id);
                        setVerActividad(actividad || null);
                        setOpenVerActividad(true);
                      } catch (err) {
                        // Fallback to navigate if fetching fails
                        router.push(`/actividades/${claseId}/ver/${a.id}`);
                      }
                    }}>Ver</Button>
                    {clase.isProfesor && (
                      <Button size="small" onClick={async () => {
                        // Open in edit mode
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
                      }} sx={{ ml: 1 }}>Editar</Button>
                    )}
                    {clase.isProfesor && (
                      <Button size="small" onClick={async () => {
                        try {
                          await actividadService.editarActividad(claseId, a.id, { isVisible: !a.is_visible });
                          await loadActividades();
                        } catch (err: any) {
                          alert(err.response?.data?.message || 'Error toggling visibility');
                        }
                      }} sx={{ ml: 1 }}>{a.is_visible ? 'Ocultar' : 'Mostrar'}</Button>
                    )}
                    {clase.isProfesor && (
                      <Button size="small" onClick={() => { setDeleteTargetId(a.id); setOpenDeleteDialog(true); }} sx={{ ml: 1 }} color="error">Eliminar</Button>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {/* Dialog Crear Actividad (en línea) */}
        <Dialog open={openCrearActividadDialog} onClose={() => setOpenCrearActividadDialog(false)} fullWidth>
            <DialogTitle>{editingActividadId ? 'Editar Actividad' : 'Crear Actividad'}</DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <TextField fullWidth label="Nombre" value={crearForm.nombre} onChange={(e) => setCrearForm({...crearForm, nombre: e.target.value})} sx={{ mb: 2, mt: 1 }} InputProps={{ sx: { paddingTop: '10px' } }} />
            <TextField fullWidth label="Descripción" multiline rows={4} value={crearForm.descripcion} onChange={(e) => setCrearForm({...crearForm, descripcion: e.target.value})} sx={{ mb: 2 }} />

            <TextField select fullWidth label="Tipo" value={crearForm.tipo} onChange={(e) => setCrearForm({...crearForm, tipo: e.target.value as any})} sx={{ mb: 2 }}>
              <MenuItem value="practica">Práctica</MenuItem>
              <MenuItem value="evaluacion">Evaluación</MenuItem>
            </TextField>

            {crearForm.tipo === 'evaluacion' && (
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField type="datetime-local" label="Fecha Inicio" InputLabelProps={{ shrink: true }} value={crearForm.fechaInicio} onChange={(e) => setCrearForm({...crearForm, fechaInicio: e.target.value})} />
                <TextField type="datetime-local" label="Fecha Fin" InputLabelProps={{ shrink: true }} value={crearForm.fechaFin} onChange={(e) => setCrearForm({...crearForm, fechaFin: e.target.value})} />
              </Box>
            )}

            <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
              <InputLabel id="ejercicios-label">Ejercicios (seleccionar)</InputLabel>
              <Select
                labelId="ejercicios-label"
                multiple
                value={crearForm.ejercicioIds}
                onChange={(e: any) => setCrearForm({...crearForm, ejercicioIds: e.target.value as string[]})}
                renderValue={(selected: any) => (selected as string[]).map(id => {
                  const found = ejercicios.find(x => x.id === id);
                  return found ? (found.metadata?.title || found.titulo || found.enunciado || id) : id;
                }).join(', ')}
                sx={{ '& .MuiSelect-select': { display: 'flex', alignItems: 'center', paddingTop: 2 } }}
                MenuProps={{ PaperProps: { sx: { '& .MuiMenuItem-root': { alignItems: 'center', py: 1 } } } }}
              >
                {ejercicios.map((ej) => (
                  <MenuItem key={ej.id} value={ej.id}>{ej.metadata?.title || ej.titulo || ej.enunciado || ej.id}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Button startIcon={<Add />} size="small" onClick={() => alert('HU Ejercicios pendiente — Implementación separada')}>Agregar ejercicio</Button>
              <Typography variant="caption" color="text.secondary">(Pendiente: funcionalidad de HU ejercicios)</Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCrearActividadDialog(false)}>Cancelar</Button>
            <Button variant="contained" onClick={async () => {
              try {
                // prepare payload similar to actividades page
                const payload = { ...crearForm } as any;
                if (payload.fechaInicio) payload.fechaInicio = new Date(payload.fechaInicio).toISOString();
                if (payload.fechaFin) payload.fechaFin = new Date(payload.fechaFin).toISOString();
                // Validations
                if (!payload.nombre || !payload.nombre.trim() || !payload.descripcion || !payload.descripcion.trim()) {
                  alert('Nombre y descripción son obligatorios');
                  return;
                }
                if (payload.tipo === 'evaluacion' && (!payload.fechaInicio || !payload.fechaFin)) {
                  alert('Las evaluaciones requieren fechaInicio y fechaFin');
                  return;
                }

                if (editingActividadId) {
                  // Update DTO doesn't accept `tipo` or `nuevosEjercicios` — filter them out.
                  const allowedKeys = ['nombre', 'descripcion', 'fechaInicio', 'fechaFin', 'isVisible', 'ejercicioIds'];
                  const updatePayload: any = {};
                  for (const k of allowedKeys) {
                    if ((payload as any)[k] !== undefined) updatePayload[k] = (payload as any)[k];
                  }
                  // Close dialog immediately to be responsive
                  setOpenCrearActividadDialog(false);
                  await actividadService.editarActividad(claseId, editingActividadId, updatePayload);
                } else {
                  setOpenCrearActividadDialog(false);
                  await actividadService.crearActividad(claseId, payload);
                }
                // already closed above
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

        {/* Dialog Ver Actividad inline para evitar 404 */}
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
                onChange={(e) => setAnuncioFormData({ ...anuncioFormData, titulo: e.target.value })}
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
                onChange={(e) => setAnuncioFormData({ ...anuncioFormData, descripcion: e.target.value })}
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