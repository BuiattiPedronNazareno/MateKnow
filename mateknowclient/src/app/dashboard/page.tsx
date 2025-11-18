'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Fab,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Crear un Grid personalizado que funcione como el clásico
const Grid = styled(Box)(({ theme }) => ({
  boxSizing: 'border-box',
}));

import {
  Add,
  School,
  Person,
  MoreVert,
  ExitToApp,
  GroupAdd,
  Settings,
} from '@mui/icons-material';
import { claseService, Clase } from '../services/claseService';
import { authService } from '../services/authService';

export default function DashboardPage() {
  const router = useRouter();
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClase, setSelectedClase] = useState<Clase | null>(null);
  const [openJoinDialog, setOpenJoinDialog] = useState(false);
  const [codigoClase, setCodigoClase] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Esperar a que el componente esté montado en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Verificar autenticación solo en el cliente
    const token = authService.getToken();
    console.log('Dashboard - Token disponible:', token ? 'Sí' : 'No');
    
    if (!authService.isAuthenticated()) {
      console.log('Dashboard - No autenticado, redirigiendo a login');
      router.push('/login');
      return;
    }

    // Cargar usuario
    const userData = authService.getUser();
    console.log('Dashboard - Usuario:', userData);
    setUser(userData);

    // Cargar clases
    loadClases();
  }, [mounted, router]);

  const loadClases = async () => {
    try {
      setLoading(true);
      const response = await claseService.getMisClases();
      setClases(response.clases);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar las clases');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, clase: Clase) => {
    setAnchorEl(event.currentTarget);
    setSelectedClase(clase);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClase(null);
  };

  const handleVerClase = (claseId: string) => {
    router.push(`/clases/${claseId}`);
    handleMenuClose();
  };

  const handleSalirClase = async () => {
    if (!selectedClase) return;
    
    try {
      await claseService.salirDeClase(selectedClase.id);
      await loadClases();
      handleMenuClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al salir de la clase');
    }
  };

  const handleJoinClase = async () => {
    if (!codigoClase.trim()) {
      setError('Por favor ingresa un código de clase');
      return;
    }

    try {
      setJoinLoading(true);
      await claseService.joinClase({ codigo: codigoClase.toUpperCase() });
      setOpenJoinDialog(false);
      setCodigoClase('');
      await loadClases();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al unirse a la clase');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    router.push('/login');
  };

  // Mostrar loading mientras se verifica la autenticación
  if (!mounted || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#3E2723' }}>
              🧉 MateKnow
            </Typography>
            <Typography variant="body1" sx={{ color: '#5D4037', mt: 0.5 }}>
              Bienvenido, {user?.nombre} {user?.apellido}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ExitToApp />}
            onClick={handleLogout}
            sx={{ borderColor: '#8B4513', color: '#8B4513' }}
          >
            Cerrar Sesión
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Estadísticas */}
        <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Mis Clases
                </Typography>
                <Typography variant="h3" sx={{ color: '#8B4513' }}>
                  {clases.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de clases
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Como Profesor
                </Typography>
                <Typography variant="h3" sx={{ color: '#D2691E' }}>
                  {clases.filter((c) => c.isProfesor).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Clases que administro
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Lista de Clases */}
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: '#3E2723' }}>
          Mis Clases
        </Typography>

        {clases.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 8 }}>
            <School sx={{ fontSize: 80, color: '#DEB887', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No tienes clases aún
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Crea una nueva clase o únete a una existente con un código
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/clases/crear')}
              sx={{
                mr: 2,
                background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
              }}
            >
              Crear Clase
            </Button>
            <Button
              variant="outlined"
              startIcon={<GroupAdd />}
              onClick={() => setOpenJoinDialog(true)}
              sx={{ borderColor: '#8B4513', color: '#8B4513' }}
            >
              Unirse a Clase
            </Button>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {clases.map((clase) => (
              <Box 
                key={clase.id}
                sx={{ 
                  flex: { 
                    xs: '1 1 100%', 
                    sm: '1 1 calc(50% - 12px)', 
                    md: '1 1 calc(33.333% - 16px)' 
                  } 
                }}
              >
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {clase.nombre}
                      </Typography>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, clase)}>
                        <MoreVert />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {clase.descripcion}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {clase.isProfesor && (
                        <Chip label="Profesor" size="small" color="primary" />
                      )}
                      <Chip
                        label={clase.isPublico ? 'Pública' : 'Privada'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                  <CardActions>
                    {/* Actividades and Crear Actividad removed from the main dashboard to reduce clutter. Use the class page to manage activities. */}
                    <Button
                      size="small"
                      fullWidth
                      variant="contained"
                      onClick={() => handleVerClase(clase.id)}
                      sx={{
                        background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                      }}
                    >
                      Ver Clase
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Box>
        )}

        {/* Menú contextual */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={() => selectedClase && handleVerClase(selectedClase.id)}>
            <Person sx={{ mr: 1 }} /> Ver Detalles
          </MenuItem>
          <MenuItem onClick={() => selectedClase && router.push(`/actividades/${selectedClase.id}`)}>
            <School sx={{ mr: 1 }} /> Ver Actividades
          </MenuItem>
          {selectedClase?.isProfesor && (
            <MenuItem onClick={() => router.push(`/clases/${selectedClase.id}/editar`)}>
              <Settings sx={{ mr: 1 }} /> Configurar
            </MenuItem>
          )}
          {!selectedClase?.isProfesor && (
            <MenuItem onClick={handleSalirClase}>
              <ExitToApp sx={{ mr: 1 }} /> Salir de la Clase
            </MenuItem>
          )}
        </Menu>

        {/* FABs */}
        <Box sx={{ position: 'fixed', bottom: 24, right: 24 }}>
          <Fab
            color="primary"
            sx={{
              background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
              mr: 2,
            }}
            onClick={() => setOpenJoinDialog(true)}
          >
            <GroupAdd />
          </Fab>
          <Fab
            color="primary"
            sx={{
              background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
            }}
            onClick={() => router.push('/clases/crear')}
          >
            <Add />
          </Fab>
        </Box>

        {/* Dialog para unirse a clase */}
        <Dialog open={openJoinDialog} onClose={() => setOpenJoinDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Unirse a una Clase</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Código de Clase"
              fullWidth
              value={codigoClase}
              onChange={(e) => setCodigoClase(e.target.value.toUpperCase())}
              placeholder="Ej: ABC123XY"
              inputProps={{ maxLength: 8 }}
              disabled={joinLoading}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenJoinDialog(false)} disabled={joinLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleJoinClase}
              variant="contained"
              disabled={joinLoading}
              sx={{
                background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
              }}
            >
              {joinLoading ? <CircularProgress size={24} /> : 'Unirse'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}