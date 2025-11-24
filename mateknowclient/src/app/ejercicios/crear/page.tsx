'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
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
      // 1. Verificar si el ejercicio YA trae un ID (caso de ejercicios de programación)
      let newEjercicioId = data.id;

      // 2. Si NO tiene ID, significa que es un ejercicio estándar (opciones, V/F)
      //    y debemos llamar al endpoint de creación general.
      if (!newEjercicioId) {
        const res = await ejercicioService.crearEjercicio(data);
        newEjercicioId = res?.ejercicio?.id;
      }

      // 3. Si venimos con la intención de adjuntar este ejercicio a una actividad existente
      if (attachActividadId && attachClaseId && newEjercicioId) {
        try {
          // Leemos la actividad actual para obtener los ejercicios previos
          const all = await actividadService.listarActividades(attachClaseId);
          const current = (all.actividades || []).find((a: any) => a.id === attachActividadId);

          if (current) {
            // Obtenemos los IDs actuales y agregamos el nuevo
            const prevIds = (current.ejercicios || []).map((e: any) => e.id);
            
            // Verificamos que no esté duplicado antes de enviar
            if (!prevIds.includes(newEjercicioId)) {
                const updatePayload = { ejercicioIds: [...prevIds, newEjercicioId] } as any;
                await actividadService.editarActividad(attachClaseId, attachActividadId, updatePayload);
            }
          }
          
          // Redirigimos a la vista de la actividad
          router.push(`/actividades/${attachClaseId}/ver/${attachActividadId}`);
          return;
        } catch (err) {
          console.error('Error attaching ejercicio to actividad', err);
        }
      }

      // 4. Si no hay actividad para vincular, volvemos a la lista general de ejercicios
      router.push('/ejercicios');

    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Error al crear el ejercicio'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    router.back();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={handleClose} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Crear Nuevo Ejercicio
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <EjercicioForm
          onSubmit={handleSubmit}
          submitButtonText="Guardar Ejercicio"
          loading={loading}
          error={''} 
        />
      </DialogContent>
    </Dialog>
  );
}