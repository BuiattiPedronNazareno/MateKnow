'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import AuthLayout from '../components/AuthLayout';
import { authService } from '../services/authService';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(''); // Limpiar error al escribir
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Hacer login
      await authService.login(formData);
      
      // Verificar que el token se guardó correctamente
      const token = localStorage.getItem('access_token');
      console.log('Token guardado:', token ? 'Sí' : 'No');
      
      if (!token) {
        throw new Error('No se pudo guardar el token');
      }
      
      // Pequeño delay para asegurar que todo esté listo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirigir al dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error en login:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Error al iniciar sesión';
      setError(errorMessage);
      setLoading(false);
    }
    // No setear loading a false si el login fue exitoso, para mantener el spinner mientras redirige
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <AuthLayout
      title="Iniciar Sesión"
      subtitle="Bienvenido de vuelta a MateKnow"
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Correo Electrónico"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
          autoFocus
          sx={{ mb: 2 }}
          disabled={loading}
        />

        <TextField
          fullWidth
          label="Contraseña"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
          sx={{ mb: 3 }}
          disabled={loading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={togglePasswordVisibility}
                  edge="end"
                  disabled={loading}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          sx={{
            mb: 2,
            py: 1.5,
            background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #654321 0%, #A0522D 100%)',
            },
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Ingresar'
          )}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Link
            href="/register"
            underline="hover"
            sx={{
              color: '#8B4513',
              fontWeight: 500,
              cursor: 'pointer',
              '&:hover': {
                color: '#654321',
              },
            }}
          >
            ¿No tienes cuenta? Regístrate aquí
          </Link>
        </Box>
      </Box>
    </AuthLayout>
  );
}