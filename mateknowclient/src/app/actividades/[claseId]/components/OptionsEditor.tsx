import React from 'react';
import { Box, IconButton, TextField, Stack, Radio, RadioGroup, FormControlLabel, Button } from '@mui/material';
import { Add, Delete } from '@mui/icons-material';

export default function OptionsEditor({ opciones = [], onChange }: { opciones?: { texto: string; is_correcta?: boolean }[]; onChange: (v: any[]) => void }) {
  const handleTextChange = (index: number, value: string) => {
    const next = [...(opciones || [])];
    next[index] = { ...next[index], texto: value };
    onChange(next);
  };

  const handleAdd = () => {
    onChange([...(opciones || []), { texto: '', is_correcta: false }]);
  };

  const handleRemove = (index: number) => {
    const next = [...(opciones || [])];
    next.splice(index, 1);
    onChange(next);
  };

  const handleMarkCorrect = (index: number) => {
    const next = (opciones || []).map((o, i) => ({ ...o, is_correcta: i === index }));
    onChange(next);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <RadioGroup value={opciones.findIndex(o => o.is_correcta === true)} onChange={(e) => handleMarkCorrect(Number(e.target.value))}>
        {(opciones || []).map((o, i) => (
          <Stack key={i} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <FormControlLabel value={i} control={<Radio />} label="" />
            <TextField value={o.texto || ''} onChange={(ev) => handleTextChange(i, ev.target.value)} fullWidth />
            <IconButton onClick={() => handleRemove(i)}><Delete /></IconButton>
          </Stack>
        ))}
      </RadioGroup>
      <Button onClick={handleAdd} startIcon={<Add />} size="small">Agregar opción</Button>
    </Box>
  );
}
