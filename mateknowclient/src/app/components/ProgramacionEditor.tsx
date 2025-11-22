"use client";

import { useState } from "react";
import { Box, TextField, Button, Typography, FormControl, InputLabel, Select, MenuItem } from "@mui/material";

const LENGUAJES_DISPONIBLES = [
  { value: 'c', label: 'C' },
  { value: 'java', label: 'Java' },
  { value: 'php', label: 'PHP' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'ruby', label: 'Ruby' },
];

export default function ProgramacionEditor({
  metadata,
  setMetadata,
  tests,
  setTests
}: {
  metadata: any;
  setMetadata: (m: any) => void;
  tests: any[];
  setTests: (t: any[]) => void;
}) {
  const addTest = () => setTests([...tests, { stdin: "", expected: "", weight: 1 }]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pb: "2em" }}>
      <FormControl fullWidth required>
        <InputLabel id="lenguaje-select-label">Lenguaje de Programación</InputLabel>
        <Select
          labelId="lenguaje-select-label"
          value={metadata.lenguaje ?? ""}
          label="Lenguaje de Programación"
          onChange={(e) => setMetadata({ ...metadata, lenguaje: e.target.value })}
        >
          {LENGUAJES_DISPONIBLES.map((lang) => (
            <MenuItem key={lang.value} value={lang.value}>
              {lang.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Código base / boilerplate"
        value={metadata.boilerplate ?? ""}
        onChange={(e) =>
          setMetadata({ ...metadata, boilerplate: e.target.value })
        }
        multiline
        rows={6}
        placeholder="# Escribe el código inicial que verán los alumnos"
      />

      <Typography variant="h6">Tests automáticos</Typography>

      {tests.map((t, i) => (
        <Box key={i} sx={{ border: "1px solid #ccc", p: 2, borderRadius: 1 }}>
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
          />
          <TextField
            label="Salida esperada"
            fullWidth
            value={t.expected}
            onChange={(e) => {
              const arr = [...tests];
              arr[i].expected = e.target.value;
              setTests(arr);
            }}
            sx={{ mb: 2 }}
            placeholder="Salida que debe producir el programa"
          />
          <TextField
            label="Peso"
            type="number"
            value={t.weight}
            onChange={(e) => {
              const arr = [...tests];
              arr[i].weight = Number(e.target.value);
              setTests(arr);
            }}
            inputProps={{ min: 1 }}
          />
        </Box>
      ))}

      <Button onClick={addTest} variant="outlined">
        + Agregar test
      </Button>
    </Box>
  );
}
