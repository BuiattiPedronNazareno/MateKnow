'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Container, Typography, Paper, CircularProgress, Chip, Button, List, ListItem, ListItemText, Divider, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { actividadService } from '@/app/services/actividadService';
import EjercicioForm from '@/app/components/EjercicioForm';
import { ejercicioService } from '@/app/services/ejercicioService';
import { claseService } from '@/app/services/claseService';

export default function ActividadVerPage() {
  const params = useParams();
  const claseId = params.claseId as string;
  const actividadId = params.actividadId as string;
  const router = useRouter();

  const [actividad, setActividad] = useState<any | null>(null);
  const [isProfesor, setIsProfesor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openCrearEjercicioModal, setOpenCrearEjercicioModal] = useState(false);
  const [crearEjercicioLoading, setCrearEjercicioLoading] = useState(false);
  const [crearEjercicioError, setCrearEjercicioError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await actividadService.listarActividades(claseId);
        const found = (res.actividades || []).find((a: any) => a.id === actividadId);
        setActividad(found || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
    (async () => {
      try {
        const c = await claseService.getClaseById(claseId);
        setIsProfesor(!!c.clase.isProfesor);
      } catch {
        // ignore
      }
    })();
  }, [claseId, actividadId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!actividad) return <Container maxWidth="md"><Paper sx={{ p: 4 }}><Typography>Actividad no encontrada</Typography></Paper></Container>;

  return (
    <>
      <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Button onClick={() => router.back()} sx={{ mb: 2 }}>Volver</Button>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>{actividad.nombre}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>{actividad.descripcion}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {actividad.tipo === 'evaluacion' && <Chip label={`Evaluación`} />}
            {!actividad.is_visible && <Chip label="Oculta" color="warning" />}
          </Box>
          {actividad.tipo === 'evaluacion' && (
            <Button variant="contained" sx={{ mb: 2 }} onClick={() => router.push(`/actividades/${claseId}/actividad/${actividadId}`)}>Resolver Actividad</Button>
          )}
          {isProfesor && (
            <Button variant="outlined" sx={{ mb: 2, ml: 1 }} onClick={() => setOpenCrearEjercicioModal(true)}>Agregar ejercicio</Button>
          )}

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Ejercicios asociados</Typography>
          {actividad.ejercicios && actividad.ejercicios.length > 0 ? (
            <List>
              {actividad.ejercicios.map((ej: any) => (
                <ListItem key={ej.id} sx={!actividad.is_visible ? { backgroundColor: 'rgba(255,152,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : { alignItems: 'flex-start' }}>
                  <ListItemText
                    primary={ej.enunciado || ej.titulo || 'Ejercicio sin título'}
                    secondary={ej.puntos ? `${ej.puntos} ptos` : '1 pto'}
                    sx={!actividad.is_visible ? { color: 'warning.main' } : {}}
                  />
                  {!actividad.is_visible && (
                    <Chip label="Oculta" color="warning" size="small" sx={{ ml: 1 }} />
                  )}
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">Aún no hay ejercicios asociados a esta actividad.</Typography>
          )}
        </Paper>
      </Container>
      </Box>
      <Dialog open={openCrearEjercicioModal} onClose={() => setOpenCrearEjercicioModal(false)} fullWidth maxWidth="md">
      <DialogTitle>Crear ejercicio</DialogTitle>
      <DialogContent>
        <EjercicioForm
          onSubmit={async (payload: any) => {
            setCrearEjercicioLoading(true);
            setCrearEjercicioError('');
            try {
              const res = await ejercicioService.crearEjercicio(payload);
              const newEjercicioId = res?.ejercicio?.id;
              if (newEjercicioId) {
                const all = await actividadService.listarActividades(claseId);
                const current = (all.actividades || []).find((a:any) => a.id === actividadId);
                const prevIds = (current?.ejercicios || []).map((e:any) => e.id);
                await actividadService.editarActividad(claseId, actividadId, { ejercicioIds: [...prevIds, newEjercicioId] });
                setOpenCrearEjercicioModal(false);
                // refresh
                const resActividades = await actividadService.listarActividades(claseId);
                const found = (resActividades.actividades || []).find((a: any) => a.id === actividadId);
                setActividad(found || null);
              }
            } catch (err: any) {
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
    </>
  );
}
