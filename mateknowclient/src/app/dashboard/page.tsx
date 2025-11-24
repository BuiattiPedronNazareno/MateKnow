'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Button,
  Chip,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Stack,
  Grid, // Usamos Grid estándar
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';

import {
  AddRounded,
  SchoolRounded,
  MoreVertRounded,
  LogoutRounded,
  GroupAddRounded,
  SettingsRounded,
  PersonRounded,
  SearchRounded,
  NotificationsNoneRounded,
  EmojiFoodBeverageRounded,
} from '@mui/icons-material';

import { claseService, Clase } from '../services/claseService';
import { authService } from '../services/authService';

import MateIcon from '../components/icons/MateIcon';
import RankingWidget from '../components/RankingWidget';

import NotificationMenu from '../components/NotificationMenu';

export default function DashboardPage() {
  const router = useRouter();
  const theme = useTheme();
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClase, setSelectedClase] = useState<Clase | null>(null);
  const [openJoinDialog, setOpenJoinDialog] = useState(false);
  const [codigoClase, setCodigoClase] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    setUser(authService.getUser());
    loadClases();
  }, [mounted, router]);

  const loadClases = async () => {
    try {
      setLoading(true);
      const response = await claseService.getMisClases();
      setClases(response.clases);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, clase: Clase) => {
    event.stopPropagation(); // Detenemos la propagación aunque ya no estén anidados por seguridad
    setAnchorEl(event.currentTarget);
    setSelectedClase(clase);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClase(null);
  };

  const handleVerClase = (claseId: string) => {
    router.push(`/clases/${claseId}`);
  };

  const handleJoinClase = async () => {
    if (!codigoClase.trim()) return;
    try {
      setJoinLoading(true);
      await claseService.joinClase({ codigo: codigoClase.toUpperCase() });
      setOpenJoinDialog(false);
      setCodigoClase('');
      await loadClases();
    } catch (err) {
      console.error(err);
    } finally {
      setJoinLoading(false);
    }
  };

  if (!mounted || loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  const stats = [
    { label: 'Mis Clases', value: clases.length },
    { label: 'Como Profesor', value: clases.filter(c => c.isProfesor).length },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 8 }}>
      {/* Navbar */}
      <Box sx={{
        py: 2,
        px: { xs: 2, md: 4 },
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: alpha(theme.palette.background.default, 0.9),
        backdropFilter: 'blur(12px)',
      }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <MateIcon sx={{ color: 'primary.main', fontSize: 40 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.03em' }}>
            MateKnow
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <NotificationMenu />
          <Avatar
            sx={{
              bgcolor: 'secondary.main',
              width: 36,
              height: 36,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              border: `2px solid ${theme.palette.primary.main}`
            }}
            onClick={() => authService.logout().then(() => router.push('/login'))}
          >
            {user?.nombre?.[0]}{user?.apellido?.[0]}
          </Avatar>
        </Stack>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 3 }}>

        {/* HERO SECTION */}
        <Box
          sx={{
            p: { xs: 3, md: 5 },
            mb: 5,
            borderRadius: 4,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            color: 'white',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.25)}`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box sx={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 250,
            height: 250,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.1)'
          }} />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="h3" sx={{ mb: 1 }}>
              Hola, {user?.nombre}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 400, opacity: 0.95, mb: 3 }}>
              ¡Preparate unos mates y empecemos a aprender!
            </Typography>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={() => router.push('/clases/crear')}
                startIcon={<AddRounded />}
                sx={{
                  bgcolor: 'background.paper',
                  color: 'primary.main',
                  '&:hover': { bgcolor: '#f0f0f0' }
                }}
              >
                Crear Clase
              </Button>
              <Button
                variant="outlined"
                onClick={() => setOpenJoinDialog(true)}
                startIcon={<GroupAddRounded />}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.6)',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                Unirse con Código
              </Button>
            </Stack>
          </Box>

          <Stack
            direction="row"
            spacing={4}
            sx={{
              mt: { xs: 4, md: 0 },
              bgcolor: 'rgba(255,255,255,0.15)',
              py: 2,
              px: 4,
              borderRadius: 3,
              backdropFilter: 'blur(5px)'
            }}
          >
            {stats.map((stat, idx) => (
              <Box key={idx} sx={{ textAlign: 'center' }}>
                <Typography variant="h3">{stat.value}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, opacity: 0.9 }}>{stat.label}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* GRID DE CLASES */}
        <Box sx={{ mb: 3, px: 1 }}>
          <Typography variant="h5" color="text.primary">
            Mis Aulas
          </Typography>
        </Box>

        {clases.length === 0 ? (
          <Box sx={{
            textAlign: 'center',
            py: 8,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.6),
            border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`
          }}>
            <SchoolRounded sx={{ fontSize: 60, color: 'primary.main', opacity: 0.5, mb: 2 }} />
            <Typography variant="h6" color="text.primary">
              Aún no tienes clases
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {clases.map((clase) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={clase.id}>
                {/* CORRECCIÓN AQUÍ: Usamos 'position: relative' en la Card */}
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative', // Necesario para el botón absoluto
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                    }
                  }}
                >
                  {/* Botón de Menú - Posicionado ABSOLUTAMENTE fuera del flujo de click principal */}
                  <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, clase)}
                      sx={{
                        color: 'text.secondary',
                        bgcolor: 'rgba(255,255,255,0.5)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                      }}
                    >
                      <MoreVertRounded />
                    </IconButton>
                  </Box>

                  {/* Área Clickable Principal - Ya NO contiene el botón de menú */}
                  <CardActionArea
                    onClick={() => handleVerClase(clase.id)}
                    sx={{
                      flexGrow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      p: 1,
                      pt: 3 // Un poco de padding extra arriba
                    }}
                  >
                    <CardContent sx={{ p: 2, pt: 1 }}>
                      <Box sx={{ mb: 2 }}>
                        <Avatar
                          variant="rounded"
                          sx={{
                            bgcolor: clase.isProfesor ? alpha(theme.palette.secondary.main, 0.15) : alpha(theme.palette.primary.main, 0.1),
                            color: clase.isProfesor ? 'secondary.main' : 'primary.main',
                            borderRadius: 2,
                            width: 48,
                            height: 48
                          }}
                        >
                          <SchoolRounded />
                        </Avatar>
                      </Box>

                      <Typography variant="h6" sx={{ mb: 0.5, lineHeight: 1.2, pr: 4 }}>
                        {clase.nombre}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          height: '40px'
                        }}
                      >
                        {clase.descripcion || 'Sin descripción.'}
                      </Typography>

                      <Stack direction="row" spacing={1}>
                        {clase.isProfesor && (
                          <Chip
                            label="Profesor"
                            size="small"
                            sx={{
                              bgcolor: alpha(theme.palette.secondary.main, 0.1),
                              color: 'secondary.main',
                            }}
                          />
                        )}
                        <Chip
                          label={clase.isPublico ? 'Pública' : 'Privada'}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Ranking Widget */}
        <RankingWidget />

        {/* Menú y Diálogos sin cambios... */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => selectedClase && handleVerClase(selectedClase.id)}>
            <SchoolRounded sx={{ mr: 1.5, color: 'primary.main' }} /> Ver Aula
          </MenuItem>
          {selectedClase?.isProfesor ? (
            <MenuItem onClick={() => router.push(`/clases/${selectedClase.id}/editar`)}>
              <SettingsRounded sx={{ mr: 1.5, color: 'primary.main' }} /> Configurar
            </MenuItem>
          ) : (
            <MenuItem onClick={() => { /* salir */ }} sx={{ color: 'error.main' }}>
              <LogoutRounded sx={{ mr: 1.5 }} /> Salir de clase
            </MenuItem>
          )}
        </Menu>

        <Dialog
          open={openJoinDialog}
          onClose={() => setOpenJoinDialog(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
            Unirse a clase
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
              Ingresa el código que te dio tu profesor.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              value={codigoClase}
              onChange={(e) => setCodigoClase(e.target.value.toUpperCase())}
              placeholder="ABC123XY"
              inputProps={{
                maxLength: 8,
                style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: 6, fontWeight: 'bold', color: theme.palette.primary.main }
              }}
              disabled={joinLoading}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'center', pb: 3 }}>
            <Button onClick={() => setOpenJoinDialog(false)} color="inherit">
              Cancelar
            </Button>
            <Button
              onClick={handleJoinClase}
              variant="contained"
              disabled={joinLoading || !codigoClase}
              sx={{ px: 4 }}
            >
              {joinLoading ? <CircularProgress size={24} color="inherit" /> : 'Unirse'}
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}