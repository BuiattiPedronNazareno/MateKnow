'use client';

import React from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';

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
        display: 'flex',
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

          {/* Logo/Icono del Mate */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 3,
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
              <Typography
                variant="h3"
                sx={{
                  color: '#FFF',
                  fontWeight: 'bold',
                  fontSize: '2.5rem',
                }}
              >
                🧉
              </Typography>
            </Box>
          </Box>

          {/* Título */}
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

          {/* Contenido (formulario) */}
          {children}

          {/* Decoración inferior */}
          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: '2px solid #F5DEB3',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Aprende jugando 🎯
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}