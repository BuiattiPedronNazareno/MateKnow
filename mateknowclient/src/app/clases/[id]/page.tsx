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
  Button,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
    if (!window.confirm('¿Estás seguro de que quieres salir de esta clase?')) {
      return;
    }
    
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

    if (!window.confirm('¿Estás seguro de que quieres eliminar este anuncio?')) {
      handleMenuClose();
      return;
    }

    try {
      await anuncioService.deleteAnuncio(selectedAnuncio.id);
      await loadAnuncios();
      handleMenuClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar anuncio');
      handleMenuClose();
    }
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