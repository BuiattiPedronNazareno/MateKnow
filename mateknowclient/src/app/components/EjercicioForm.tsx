'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Typography,
  Tooltip,
  IconButton,
  RadioGroup,
  Radio,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import OpcionField from './OpcionField';
import { ejercicioService, TipoEjercicio, CreateEjercicioData, UpdateEjercicioData, Opcion } from '@/app/services/ejercicioService';

interface EjercicioFormProps {
  initialData?: {
    id?: string;
    tipoId: string;
    enunciado: string;
    puntos: number;
    isVersus: boolean;
    opciones: Opcion[];
  };
  onSubmit: (data: CreateEjercicioData | UpdateEjercicioData) => void;
  submitButtonText: string;
  loading: boolean;
  error: string;
  onCancel?: () => void;
}

export default function EjercicioForm({
  initialData,
  onSubmit,
  submitButtonText,
  loading,
  error,
  onCancel,
}: EjercicioFormProps) {
  const [tipoId, setTipoId] = useState(initialData?.tipoId || '');
  const [enunciado, setEnunciado] = useState(initialData?.enunciado || '');
  const [puntos, setPuntos] = useState(initialData?.puntos?.toString() || '1');
  const [isVersus, setIsVersus] = useState(initialData?.isVersus || false);
  const [opciones, setOpciones] = useState<Opcion[]>(initialData?.opciones || [{ texto: '', isCorrecta: false }, { texto: '', isCorrecta: false }]);
  const [tiposEjercicio, setTiposEjercicio] = useState<TipoEjercicio[]>([]);
  const [fetchError, setFetchError] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoEjercicio | null>(null);

  useEffect(() => {
    const loadTipos = async () => {
      try {
        const response = await ejercicioService.obtenerTiposEjercicio();
        setTiposEjercicio(response.tipos);
        if (initialData?.tipoId) {
          const tipo = response.tipos.find(t => t.id === initialData.tipoId);
          setTipoSeleccionado(tipo || null);
        }
        // Set default tipo to first available type if none selected
        if (!initialData?.tipoId && !tipoId && response.tipos && response.tipos.length > 0) {
          setTipoId(response.tipos[0].id);
        }
        // If backend doesn't return tipos, keep empty and show error to user
        if (!response.tipos || response.tipos.length === 0) {
          setTiposEjercicio([]);
          setTipoId('');
          setFetchError('No hay tipos de ejercicio definidos en el servidor. Contacta al administrador.');
          return;
        }
      } catch (err: any) {
        setFetchError(err.response?.data?.message || 'Error al cargar tipos de ejercicio');
      }
    };

    loadTipos();
  }, []);

  useEffect(() => {
    if (tipoId) {
      const tipo = tiposEjercicio.find(t => t.id === tipoId);
      setTipoSeleccionado(tipo || null);
      
      if (tipo?.key === 'true_false') {
        setOpciones([
          { texto: 'Verdadero', isCorrecta: false },
          { texto: 'Falso', isCorrecta: false }
        ]);
      } else if (tipo?.key === 'multiple-choice' && opciones.length < 2) {
        setOpciones([{ texto: '', isCorrecta: false }, { texto: '', isCorrecta: false }]);
      }
    }
  }, [tipoId, tiposEjercicio]);

  const handleAddOpcion = () => {
    if (tipoSeleccionado?.key === 'true_false') {
      return; 
    }
    
    setOpciones([...opciones, { texto: '', isCorrecta: false }]);
  };

  const handleRemoveOpcion = (index: number) => {
    if (opciones.length <= 2) return; 
    
    const nuevasOpciones = [...opciones];
    nuevasOpciones.splice(index, 1);
    setOpciones(nuevasOpciones);
  };

  const handleOpcionChange = (index: number, field: 'texto' | 'isCorrecta', value: any) => {
    const nuevasOpciones = [...opciones];
    nuevasOpciones[index] = { ...nuevasOpciones[index], [field]: value };
    setOpciones(nuevasOpciones);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate tipoId format (server requires UUID)
    const isUuid = (s?: string) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    if (!isUuid(tipoId)) {
      setFetchError('El tipo seleccionado no es válido. Comprueba los tipos de ejercicio en el servidor.');
      return;
    }
    if (!tipoId) {
      setFetchError('Por favor selecciona un tipo de ejercicio');
      return;
    }
    
    if (!enunciado.trim()) {
      setFetchError('El enunciado es obligatorio');
      return;
    }
    
    if (opciones.some(o => !o.texto.trim())) {
      setFetchError('Todas las opciones deben tener texto');
      return;
    }
    
    const correctas = opciones.filter(o => o.isCorrecta).length;
    if (correctas === 0) {
      setFetchError('Debe haber al menos una opción correcta');
      return;
    }
    
    if (tipoSeleccionado?.key === 'true_false' && correctas !== 1) {
      setFetchError('En Verdadero/Falso debe haber exactamente una opción correcta');
      return;
    }

    onSubmit({
      tipoId,
      enunciado: enunciado.trim(),
      puntos: parseInt(puntos, 10) || 1,
      isVersus,
      opciones: opciones.map(o => ({ ...o, texto: o.texto.trim() })),
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {fetchError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFetchError('')}>
          {fetchError}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel id="tipo-select-label">Tipo de Ejercicio</InputLabel>
            <Select
              labelId="tipo-select-label"
              id="tipo-select"
              value={tipoId}
              label="Tipo de Ejercicio"
              onChange={(e) => setTipoId(e.target.value)}
              disabled={tiposEjercicio.length === 0}
              MenuProps={{ disablePortal: true }}
            >
              {tiposEjercicio.map((tipo) => (
                <MenuItem key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
          <TextField
            label="Puntos"
            type="number"
            value={puntos}
            onChange={(e) => setPuntos(e.target.value)}
            fullWidth
            required
            inputProps={{ min: 0 }}
            sx={{ mb: 2 }}
          />
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          label="Enunciado del Ejercicio"
          value={enunciado}
          onChange={(e) => setEnunciado(e.target.value)}
          fullWidth
          multiline
          rows={4}
          required
          sx={{ mb: 2 }}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={isVersus}
              onChange={(e) => setIsVersus(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body1">Modo Versus</Typography>
              <Tooltip title="Este ejercicio podrá usarse en el Modo Versus">
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Opciones de Respuesta
        </Typography>
        
        {tipoSeleccionado?.descripcion && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {tipoSeleccionado.descripcion}
          </Alert>
        )}

        {tipoSeleccionado?.key === 'true_false' ? (
          <RadioGroup
            value={opciones.findIndex(o => o.isCorrecta === true).toString()}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const idx = Number(e.target.value);
              // set only the selected option as correct
              setOpciones(opciones.map((o, i) => ({ ...o, isCorrecta: i === idx })));
            }}
          >
            {opciones.map((opcion, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, border: '1px solid #ccc', borderRadius: 2, mb: 2, bgcolor: '#fafafa' }}>
                <FormControlLabel value={index.toString()} control={<Radio />} label="" />
                <TextField value={opcion.texto} onChange={(ev) => handleOpcionChange(index, 'texto', ev.target.value)} fullWidth />
              </Box>
            ))}
          </RadioGroup>
        ) : (
          opciones.map((opcion, index) => (
            <OpcionField
              key={index}
              opcion={opcion}
              index={index}
              tipoEjercicio={tipoSeleccionado?.key || ''}
              onChange={handleOpcionChange}
              onRemove={handleRemoveOpcion}
              showRemoveButton={opciones.length > 2 || tipoSeleccionado?.key !== 'true_false'}
            />
          ))
        )}
        
        {tipoSeleccionado?.key !== 'true_false' && (
          <Button
            variant="outlined"
            fullWidth
            onClick={handleAddOpcion}
            sx={{ mt: 1 }}
          >
            + Agregar Opción
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
        {onCancel && (
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{
            background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #654321 0%, #A0522D 100%)',
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : submitButtonText}
        </Button>
      </Box>
    </Box>
  );
}