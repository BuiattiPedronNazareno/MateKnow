'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogProps,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Add as AddIcon } from '@mui/icons-material';
import EjercicioForm from '@/app/components/EjercicioForm';
import { ejercicioService } from '@/app/services/ejercicioService';
import { actividadService } from '@/app/services/actividadService';

export default function CrearEjercicioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attachActividadId = searchParams?.get('attachActividadId');
  const attachClaseId = searchParams?.get('attachClaseId');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(true);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    setError('');
    try {
      const res = await ejercicioService.crearEjercicio(data);
      const newEjercicioId = res?.ejercicio?.id;

      if (!data.tests) {
        const res = await ejercicioService.crearEjercicio(data);
        const newEjercicioId = res?.ejercicio?.id;

        // If we were called with attachActividadId, try to append this ejercicio to that actividad
        if (attachActividadId && attachClaseId && newEjercicioId) {
          try {
            // read current actividad to get ejercicioIds
            const all = await actividadService.listarActividades(attachClaseId);
            const current = (all.actividades || []).find((a: any) => a.id === attachActividadId);
            const prevIds = (current?.ejercicios || []).map((e: any) => e.id);
            const updatePayload = { ejercicioIds: [...prevIds, newEjercicioId] } as any;
            await actividadService.editarActividad(attachClaseId, attachActividadId, updatePayload);
            // after attaching, go to activity page
            router.push(`/actividades/${attachClaseId}/ver/${attachActividadId}`);
            return;
          } catch (err) {
            // fallback: navigate to ejercicios list
            console.error('Error attaching ejercicio to actividad', err);
          }
        }
      }

      router.push('/ejercicios');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear el ejercicio');
    }
  };

  return (
    <Dialog open={open} onClose={() => { setOpen(false); router.back(); }} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => { setOpen(false); router.back(); }} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Crear Nuevo Ejercicio</Typography>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <EjercicioForm
          onSubmit={handleSubmit}
          submitButtonText="Crear Ejercicio"
          loading={loading}
          error={''}
        />
      </DialogContent>
    </Dialog>
  );
}