'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Container, Paper, Typography, Button, Divider, Avatar, TextField } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { anuncioService } from '@/app/services/anuncioService'; 
import { CircularProgress } from '@mui/material';

export default function DetalleAnuncioPage() {
  const { id: claseId, anuncioId } = useParams();
  const router = useRouter();
  const [anuncio, setAnuncio] = useState<any>(null);
  const [comentarios, setComentarios] = useState<any[]>([]);

    useEffect(() => {
    const cargarDatos = async () => {
      // Evitamos llamadas si el ID no está listo
      if (!anuncioId) return;

      try {
        // 1. Obtenemos el anuncio
        // Tu servicio devuelve { anuncio: ... }
        const dataAnuncio = await anuncioService.getAnuncioById(anuncioId as string);
        setAnuncio(dataAnuncio.anuncio);

        // 2. Obtenemos los comentarios (página 1 por defecto)
        // Tu servicio devuelve { comentarios: [...], meta: ... }
        const dataComentarios = await anuncioService.getComentarios(anuncioId as string);
        setComentarios(dataComentarios.comentarios);
        
      } catch (error) {
        console.error('Error cargando el anuncio:', error);
        // Opcional: Podrías redirigir o mostrar una alerta si falla
      }
    };

    cargarDatos();
  }, [anuncioId]);

  
if (!anuncio) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#F5DEB3' }}>
        <CircularProgress sx={{ color: '#8B4513' }} />
      </Box>
    );
  }
  
  return (
    <Box sx={{ bgcolor: '#F5DEB3', minHeight: '100vh', p: 3 }}>
      <Container maxWidth="md">
        <Button startIcon={<ArrowBack />} onClick={() => router.push(`/clases/${claseId}`)} sx={{ mb: 2 }}>
          Volver a la clase
        </Button>

        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar sx={{ bgcolor: '#8B4513' }}>{anuncio.autor?.nombre[0]}</Avatar>
            <Box>
              <Typography variant="h5" sx={{ color: '#3E2723', fontWeight: 'bold' }}>
                {anuncio.autor?.nombre} {anuncio.autor?.apellido}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(anuncio.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="h6" gutterBottom>{anuncio.titulo}</Typography>
          <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
            {anuncio.descripcion}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ mb: 2 }}>Comentarios de la clase</Typography>
          
          {/* Lista de Comentarios */}
          {comentarios.map((c) => (
             <Box key={c.id} sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <Avatar src={c.autor.avatar} alt={c.autor.nombre} sx={{ width: 32, height: 32 }}/>
                <Box>
                   <Typography variant="subtitle2" fontWeight="bold">
                      {c.autor.nombre} {c.autor.apellido}
                   </Typography>
                   <Typography variant="body2">{c.contenido}</Typography>
                </Box>
             </Box>
          ))}
          
          {/* Input para nuevo comentario aquí */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
             <Avatar sx={{ width: 32, height: 32 }} />
             <TextField 
                fullWidth size="small" 
                placeholder="Añadir un comentario de clase..." 
                variant="outlined" 
                sx={{ bgcolor: 'white', borderRadius: 1 }}
             />
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}