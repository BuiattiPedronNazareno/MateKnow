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
  Grid
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
} from '@mui/icons-material';
import { claseService, ClaseDetalle } from '@/app/services/claseService';
import { authService } from '@/app/services/authService';
import MatricularAlumnoDialog from '@/app/components/MatricularAlumnoDialog';

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

  useEffect(() => {
    loadClase();
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
      await loadClase(); // Recargar la lista de alumnos
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

        {/* Tabs de Profesores y Alumnos */}
        <Paper>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
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

          <TabPanel value={tabValue} index={0}>
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

          <TabPanel value={tabValue} index={1}>
            {clase.isProfesor && clase.alumnos.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Puedes promover a un alumno a profesor haciendo clic en su nombre
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
      </Container>
    </Box>
  );
}