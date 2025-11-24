'use client';

import React, { useState, useEffect } from 'react';
import {
  Badge, IconButton, Menu, MenuItem, Typography, Box,
  List, ListItemButton, ListItemText, Divider, Tooltip, 
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  DoneAll,
  CheckCircle,
  RadioButtonUnchecked,
  Circle,
  DeleteSweep
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { notificacionService } from '../services/notificationService';

export default function NotificationMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const router = useRouter();

  // Obtener token de manera segura
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

  const cargarNotificaciones = async () => {
    if (!token) return;
    try {
      const data = await notificacionService.getMisNotificaciones(token);
      setNotificaciones(data);
    } catch (error) {
      console.error("Error cargando notificaciones", error);
    }
  };

  const handleEliminarTodo = async () => {
    if (!token) return;
    try {
      await notificacionService.eliminarTodas(token);
      setNotificaciones([]); // Limpiamos la lista localmente
    } catch (e) { console.error(e); }
  };

  // Carga inicial + Polling cada 10 segundos
  useEffect(() => {
    cargarNotificaciones();
    const intervalo = setInterval(cargarNotificaciones, 10000);
    return () => clearInterval(intervalo);
  }, []);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleClickNotificacion = async (notif: any) => {
    // 1. Si no está leída, marcarla
    if (!notif.leida && token) {
      try {
        await notificacionService.marcarLeida(notif.id, token);
        // Actualización optimista local
        setNotificaciones(prev => prev.map(n => n.id === notif.id ? { ...n, leida: true } : n));
      } catch (e) { console.error(e); }
    }
    // 2. Cerrar menú y navegar
    handleClose();
    if (notif.link) router.push(notif.link);
  };

  const handleMarcarTodo = async () => {
    if (!token) return;
    try {
      await notificacionService.marcarTodasLeidas(token);
      // Actualización optimista: marcar todas como true visualmente
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (e) { console.error(e); }
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={noLeidas} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        disableScrollLock={true}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 400,
            mt: 1.5,
            borderRadius: 2,
            boxShadow: '0px 5px 15px rgba(0,0,0,0.2)',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }
        }}
      >
        {/* CABECERA DEL MENÚ */}
        <Box sx={{
          p: 2,
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: '#fff'
        }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#3E2723' }}>
            Notificaciones
          </Typography>
          
          <Box>
            {/* Botón Marcar todo (si hay no leídas) */}
            {noLeidas > 0 && (
              <Tooltip title="Marcar todo como leído">
                <IconButton size="small" onClick={handleMarcarTodo} color="primary" sx={{ mr: 1 }}>
                  <DoneAll fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Botón BORRAR TODO (si hay notificaciones) */}
            {notificaciones.length > 0 && (
              <Tooltip title="Borrar todas">
                <IconButton size="small" onClick={handleEliminarTodo} color="error">
                  <DeleteSweep fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <List sx={{ p: 0 }}>
          {notificaciones.length === 0 ? (
            <MenuItem disabled sx={{ justifyContent: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No tienes notificaciones
              </Typography>
            </MenuItem>
          ) : (
            notificaciones.map((notif) => (
              <React.Fragment key={notif.id}>
                <ListItemButton
                  onClick={() => handleClickNotificacion(notif)}
                  alignItems="flex-start"
                  sx={{
                    bgcolor: notif.leida ? 'transparent' : 'rgba(255, 152, 0, 0.08)', // Fondo sutil si no está leída
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                    py: 1.5
                  }}
                >
                  <ListItemText
                    disableTypography
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5} >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: notif.leida ? 400 : 700,
                            color: '#3E2723',
                            lineHeight: 1.2,
                            maxWidth: '85%'
                          }}
                        >
                          {notif.titulo}
                        </Typography>
                        
                        {/* INDICADOR VISUAL */}
                        <Box sx={{ mt: 0.5 }}>
                          {notif.leida ? (
                            <Tooltip title="Leída">
                              <CheckCircle sx={{ fontSize: 16, color: '#4CAF50' }} />
                            </Tooltip>
                          ) : (
                            <Tooltip title="No leída">
                              <RadioButtonUnchecked sx={{ fontSize: 16, color: '#FF9800' }} />
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1.3, mb: 0.5 }}>
                          {notif.contenido}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9E9E9E', fontSize: '0.7rem' }}>
                          {new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
                <Divider component="li" />
              </React.Fragment>
            ))
          )}
        </List>
      </Menu>
    </>
  );
}