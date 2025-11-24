'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Container, Paper, Typography, Button, Divider, Avatar, TextField, IconButton, CircularProgress } from '@mui/material';
import { ArrowBack, Send as SendIcon } from '@mui/icons-material';
import { anuncioService } from '@/app/services/anuncioService'; 

export default function DetalleAnuncioPage() {
  const { id: claseId, anuncioId } = useParams();
  const router = useRouter();
  const [anuncio, setAnuncio] = useState<any>(null);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState(''); // Estado para el nuevo comentario

  useEffect(() => {
    cargarDatos();
  }, [anuncioId]);

  const cargarDatos = async () => {
    // Evitamos llamadas si el ID no está listo
    if (!anuncioId) return;

    try {
      // 1. Obtenemos el anuncio
      const dataAnuncio = await anuncioService.getAnuncioById(anuncioId as string);
      setAnuncio(dataAnuncio.anuncio);

      // 2. Obtenemos los comentarios
      const dataComentarios = await anuncioService.getComentarios(anuncioId as string);
      setComentarios(dataComentarios.comentarios);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const handleSendComment = async () => {
    if (!newCommentText.trim() || !anuncioId) return;

    try {
      await anuncioService.createComentario(anuncioId as string, newCommentText);
      setNewCommentText(''); // Limpiar input
      
      // Recargar comentarios para ver el nuevo
      const dataComentarios = await anuncioService.getComentarios(anuncioId as string);
      setComentarios(dataComentarios.comentarios);
    } catch (error) {
      console.error('Error enviando comentario:', error);
    }
  };
  
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
        <Button startIcon={<ArrowBack />} onClick={() => router.push(`/clases/${claseId}`)} sx={{ mb: 2, color: '#5D4037' }}>
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
          
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>{anuncio.titulo}</Typography>
          <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap', color: '#424242' }}>
            {anuncio.descripcion}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ mb: 2, color: '#5D4037' }}>Comentarios de la clase</Typography>
          
          {/* Lista de Comentarios */}
          {comentarios.length === 0 ? (
             <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 3 }}>
                No hay comentarios aún.
             </Typography>
          ) : (
             comentarios.map((c) => (
               <Box key={c.id} sx={{ mb: 2, display: 'flex', gap: 2 }}>
                  <Avatar src={c.autor.avatar} alt={c.autor.nombre} sx={{ width: 32, height: 32, bgcolor: '#A0522D', fontSize: '0.8rem' }}>
                    {c.autor.nombre[0]}
                  </Avatar>
                  <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 2, flex: 1 }}>
                     <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                        {c.autor.nombre} {c.autor.apellido}
                     </Typography>
                     <Typography variant="body2" sx={{ mt: 0.5 }}>{c.contenido}</Typography>
                  </Box>
               </Box>
             ))
          )}
          
          {/* Input para nuevo comentario */}
          <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
             <Avatar sx={{ width: 32, height: 32, bgcolor: '#8B4513' }} />
             <TextField 
                fullWidth 
                size="small" 
                placeholder="Añadir un comentario de clase..." 
                variant="outlined" 
                sx={{ bgcolor: 'white', borderRadius: 1 }}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleSendComment(); }}
             />
             <IconButton 
                onClick={handleSendComment} 
                disabled={!newCommentText.trim()} 
                sx={{ 
                  bgcolor: '#8B4513', 
                  color: 'white', 
                  width: 40, 
                  height: 40, 
                  '&:hover': { bgcolor: '#5D4037' }, 
                  '&.Mui-disabled': { bgcolor: 'rgba(0, 0, 0, 0.12)', color: 'rgba(0, 0, 0, 0.26)' } 
                }}
             >
                <SendIcon fontSize="small" />
             </IconButton>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}