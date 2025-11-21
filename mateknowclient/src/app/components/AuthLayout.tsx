'use client';

import React from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import MateIcon from './icons/MateIcon';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #F5DEB3 0%, #DEB887 100%)',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={8}
          sx={{
            padding: { xs: 3, sm: 5 },
            borderRadius: 4,
            background: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch', // Asegura que el contenido ocupe el ancho
          }}
        >
          {/* Decoración superior - borde del mate */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 8,
              background: 'linear-gradient(90deg, #8B4513 0%, #D2691E 50%, #8B4513 100%)',
            }}
          />

          {/* CONTENEDOR DEL ÍCONO (CENTRADO) */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 3,
              width: '100%',
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(139, 69, 19, 0.3)',
              }}
            >
              {/* Ícono SVG centrado y blanco */}
              <MateIcon 
                sx={{ 
                  fontSize: '3.5rem', 
                  color: '#FFFFFF',
                  display: 'block' // Evita comportamientos inline extraños
                }} 
              />
            </Box>
          </Box>

          {/* Títulos centrados */}
          <Typography
            variant="h1"
            align="center"
            gutterBottom
            sx={{
              fontSize: { xs: '1.75rem', sm: '2rem' },
              fontWeight: 700,
              color: '#3E2723',
              mb: 1,
            }}
          >
            MateKnow
          </Typography>

          <Typography
            variant="h2"
            align="center"
            gutterBottom
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              fontWeight: 500,
              color: '#5D4037',
              mb: 1,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="body1"
              align="center"
              sx={{
                color: '#757575',
                mb: 4,
              }}
            >
              {subtitle}
            </Typography>
          )}

          {/* Formulario */}
          {children}

          {/* Footer centrado */}
          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: '2px solid #F5DEB3',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Aprendé jugando
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}