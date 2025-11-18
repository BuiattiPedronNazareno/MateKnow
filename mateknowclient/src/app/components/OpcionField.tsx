'use client';

import React from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Info as InfoIcon } from '@mui/icons-material';

interface OpcionFieldProps {
  opcion: { texto: string; isCorrecta: boolean };
  index: number;
  tipoEjercicio: string;
  onChange: (index: number, field: 'texto' | 'isCorrecta', value: any) => void;
  onRemove: (index: number) => void;
  showRemoveButton?: boolean;
}

export default function OpcionField({
  opcion,
  index,
  tipoEjercicio,
  onChange,
  onRemove,
  showRemoveButton = true,
}: OpcionFieldProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        border: '1px solid #ccc',
        borderRadius: 2,
        mb: 2,
        bgcolor: '#fafafa',
      }}
    >
      <TextField
        label={`Opción ${index + 1}`}
        value={opcion.texto}
        onChange={(e) => onChange(index, 'texto', e.target.value)}
        fullWidth
        variant="outlined"
        size="small"
        required
      />
      
      {tipoEjercicio !== 'match' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={opcion.isCorrecta}
                onChange={(e) => onChange(index, 'isCorrecta', e.target.checked)}
                color="primary"
              />
            }
            label="Correcta"
          />
        </Box>
      )}

      {showRemoveButton && (
        <Tooltip title="Eliminar opción">
          <IconButton onClick={() => onRemove(index)} color="error">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}