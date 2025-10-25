'use client';

import { createTheme } from '@mui/material/styles';

// Colores inspirados en el mate argentino
export const mateTheme = createTheme({
  palette: {
    primary: {
      main: '#8B4513', // Marrón mate oscuro
      light: '#A0522D',
      dark: '#654321',
      contrastText: '#FFF',
    },
    secondary: {
      main: '#D2691E', // Naranja calabaza (mate)
      light: '#F4A460',
      dark: '#8B4513',
      contrastText: '#FFF',
    },
    background: {
      default: '#F5DEB3', // Beige claro (como el fondo de la imagen)
      paper: '#FFFFFF',
    },
    text: {
      primary: '#3E2723',
      secondary: '#5D4037',
    },
    error: {
      main: '#D32F2F',
    },
    success: {
      main: '#388E3C',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      color: '#3E2723',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      color: '#3E2723',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '1rem',
        },
        contained: {
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: '#8B4513',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        },
      },
    },
  },
});