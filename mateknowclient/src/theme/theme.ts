'use client';

import { createTheme, alpha } from '@mui/material/styles';

// Paleta MateKnow
const MATE_BROWN = '#8B4513';
const MATE_ORANGE = '#D2691E';
const MATE_BG = '#F5DEB3';
const TEXT_DARK = '#3E2723';

export const mateTheme = createTheme({
  palette: {
    primary: {
      main: MATE_BROWN,
      light: '#A0522D',
      dark: '#5D4037',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: MATE_ORANGE,
      light: '#FF7F50',
      contrastText: '#FFFFFF',
    },
    background: {
      default: MATE_BG,
      paper: '#FFFFFF',
    },
    text: {
      primary: TEXT_DARK,
      secondary: alpha(TEXT_DARK, 0.7),
    },
  },
  shape: {
    borderRadius: 24, // Bordes redondeados (Estilo Google)
  },
  typography: {
    fontFamily: 'var(--font-google-sans), "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' }, 
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    button: { 
      textTransform: 'none', 
      fontWeight: 600 
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 50, // Botones tipo Píldora
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
        },
        contained: {
          '&:hover': {
            backgroundColor: MATE_ORANGE, // Efecto hover global
          }
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: 'none',
          border: '1px solid transparent',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            backgroundColor: alpha('#FFF', 0.8),
            '& fieldset': { borderColor: alpha(MATE_BROWN, 0.3) },
            '&:hover fieldset': { borderColor: MATE_BROWN },
            '&.Mui-focused fieldset': { borderWidth: 2 }
          }
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
          padding: 16,
        }
      }
    }
  },
});