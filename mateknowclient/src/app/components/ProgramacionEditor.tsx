"use client";

import { Box, TextField, Button, Typography, FormControl, InputLabel, Select, MenuItem, Paper, Alert, Divider, Tooltip, IconButton } from "@mui/material";
import InfoIcon from '@mui/icons-material/Info';

const LENGUAJES_DISPONIBLES = [
  { value: 'c', label: 'C', extension: 'c' },
  { value: 'cpp', label: 'C++', extension: 'cpp' },
  { value: 'csharp', label: 'C#', extension: 'cs' },
  { value: 'go', label: 'Go', extension: 'go' },
  { value: 'java', label: 'Java', extension: 'java' },
  { value: 'javascript', label: 'JavaScript', extension: 'js' },
  { value: 'php', label: 'PHP', extension: 'php' },
  { value: 'python', label: 'Python', extension: 'py' },
  { value: 'ruby', label: 'Ruby', extension: 'rb' },
  { value: 'rust', label: 'Rust', extension: 'rs' },
  { value: 'typescript', label: 'TypeScript', extension: 'ts' },
];

export default function ProgramacionEditor({
  metadata,
  setMetadata,
  tests,
  setTests,
  puntos
}: {
  metadata: any;
  setMetadata: (m: any) => void;
  tests: any[];
  setTests: (t: any[]) => void;
  puntos?: number;
}) {
  // ⭐ FUNCIÓN PARA AGREGAR TEST
  const addTest = () => {
    setTests([
      ...tests, 
      { 
        stdin: "", 
        expected: "", 
        weight: 1,
        timeout_seconds: 3, 
        public: false,      
      }
    ]);
  };

  // ⭐ FUNCIÓN PARA ELIMINAR TEST
  const removeTest = (index: number) => {
    setTests(tests.filter((_, i) => i !== index));
  };

  // ⭐ Calcular suma de pesos en tiempo real
  const sumaPesos = tests.reduce((sum, t) => sum + (t.weight || 1), 0);
  const puntosEjercicio = puntos || 0;
  const diferencia = puntosEjercicio - sumaPesos;
  const isBalanceado = diferencia === 0 && puntosEjercicio > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pb: "2em" }}>

      <Alert 
        severity="info" 
        sx={{ mb: 0, bgcolor: '#E1F5FE', color: '#0277BD', fontWeight: 500 }}
      >
        ℹ️ El código debe escribirse en <strong>Python</strong>.
      </Alert>

      <TextField
        label="Código base / boilerplate (opcional)"
        value={metadata.boilerplate ?? ""}
        onChange={(e) =>
          setMetadata({ ...metadata, boilerplate: e.target.value })
        }
        multiline
        rows={6}
        placeholder="// Escribe el código inicial que verán los alumnos"
        helperText="Código que aparecerá al abrir el editor (opcional)"
      />

      <Divider sx={{ my: 2 }} />

      {/* ⭐ SECCIÓN DE TESTS CON INDICADOR */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h6">Tests Automatizados</Typography>
          
          {/* ⭐ ICONO DE INFORMACIÓN */}
          <Tooltip 
            title={
              <Box sx={{ p: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  ℹ️ Importante: Balance de Pesos
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                  La <strong>suma de los pesos de todos los tests</strong> debe ser igual a los <strong>puntos del ejercicio</strong>.
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: '#90CAF9' }}>
                  <strong>Ejemplo:</strong> Si el ejercicio vale 10 puntos, los pesos podrían ser: 2 + 3 + 5 = 10
                </Typography>
              </Box>
            }
            arrow
            placement="right"
          >
            <IconButton size="small" sx={{ color: '#1976d2' }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Define los casos de prueba que se ejecutarán para validar el código del alumno.
        </Typography>

        {/* ⭐ INDICADOR DE BALANCE */}
        {puntosEjercicio > 0 && (
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              mb: 3,
              bgcolor: isBalanceado ? '#E8F5E9' : (diferencia === 0 ? '#F5F5F5' : '#FFF3E0'),
              border: `2px solid ${isBalanceado ? '#4CAF50' : (diferencia === 0 ? '#E0E0E0' : '#FF9800')}`,
              borderRadius: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {isBalanceado ? '✅' : '⚠️'} Balance de Puntaje
              </Typography>
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, mb: 1 }}>
              <Typography variant="body2">Puntos del ejercicio:</Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ textAlign: 'right' }}>
                {puntosEjercicio}
              </Typography>
              
              <Typography variant="body2">Suma de pesos de tests:</Typography>
              <Typography 
                variant="body2" 
                fontWeight="bold"
                sx={{ 
                  textAlign: 'right',
                  color: isBalanceado ? 'success.main' : (diferencia === 0 ? 'text.secondary' : 'warning.main')
                }}
              >
                {sumaPesos}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 1 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography 
                variant="body2" 
                fontWeight="bold"
                sx={{ color: isBalanceado ? 'success.main' : (diferencia === 0 ? 'text.secondary' : 'warning.main') }}
              >
                {isBalanceado 
                  ? '✅ Balanceado correctamente' 
                  : diferencia === 0 
                    ? 'Configura los puntos del ejercicio primero'
                    : `${diferencia > 0 ? '⚠️ Faltan' : '⚠️ Sobran'} ${Math.abs(diferencia)} punto${Math.abs(diferencia) !== 1 ? 's' : ''}`
                }
              </Typography>
              
              {!isBalanceado && diferencia !== 0 && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    bgcolor: 'warning.main', 
                    color: 'white', 
                    px: 1, 
                    py: 0.5, 
                    borderRadius: 1,
                    fontWeight: 600
                  }}
                >
                  Ajustar pesos
                </Typography>
              )}
            </Box>
            
            {!isBalanceado && diferencia !== 0 && (
              <Alert severity="warning" sx={{ mt: 2 }} icon={<InfoIcon />}>
                {diferencia > 0 
                  ? `Debes distribuir ${diferencia} punto${diferencia !== 1 ? 's' : ''} más entre los tests`
                  : `Reduce ${Math.abs(diferencia)} punto${Math.abs(diferencia) !== 1 ? 's' : ''} de los pesos de los tests`
                }
              </Alert>
            )}
          </Paper>
        )}
      </Box>

      {/* ⭐ LISTA DE TESTS */}
      {tests.map((t, i) => (
        <Box 
          key={i} 
          sx={{ 
            border: "1px solid #ccc", 
            p: 2, 
            borderRadius: 2,
            bgcolor: '#fafafa',
            position: 'relative'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#3E2723' }}>
              Test {i + 1}
            </Typography>
            
            {/* ⭐ Mostrar peso visual */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>
                Peso: {t.weight || 1} pt{(t.weight || 1) !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
          
          <TextField
            label="Entrada (stdin)"
            fullWidth
            value={t.stdin}
            onChange={(e) => {
              const arr = [...tests];
              arr[i].stdin = e.target.value;
              setTests(arr);
            }}
            sx={{ mb: 2 }}
            placeholder="Datos de entrada para el programa"
            helperText="Dejar vacío si no requiere entrada"
          />
          
          <TextField
            label="Salida esperada *"
            fullWidth
            required
            value={t.expected}
            onChange={(e) => {
              const arr = [...tests];
              arr[i].expected = e.target.value;
              setTests(arr);
            }}
            sx={{ mb: 2 }}
            placeholder="Salida que debe producir el programa"
            error={!t.expected?.trim()}
            helperText={!t.expected?.trim() ? "Este campo es obligatorio" : "Salida exacta esperada"}
          />
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              label="Peso del test"
              type="number"
              value={t.weight}
              onChange={(e) => {
                const arr = [...tests];
                arr[i].weight = Number(e.target.value);
                setTests(arr);
              }}
              inputProps={{ min: 1 }}
              sx={{ flex: 1 }}
              helperText="Puntos que vale este test"
            />
            
            {tests.length > 1 && (
              <Button 
                variant="outlined" 
                color="error"
                onClick={() => removeTest(i)}
                sx={{ mt: 1 }}
              >
                Eliminar
              </Button>
            )}
          </Box>
        </Box>
      ))}

      <Button 
        onClick={addTest} 
        variant="outlined" 
        sx={{ alignSelf: 'flex-start' }}
      >
        + Agregar Test
      </Button>
    </Box>
  );
}