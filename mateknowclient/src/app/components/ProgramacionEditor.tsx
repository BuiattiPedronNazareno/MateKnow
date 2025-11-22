"use client";

import { useState } from "react";
import { Box, TextField, Button, Typography } from "@mui/material";

export default function ProgramacionEditor({
  enunciado,
  setEnunciado,
  metadata,
  setMetadata,
  tests,
  setTests
}) {

  const addTest = () => setTests([...tests, { stdin: "", expected: "", weight: 1 }]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <TextField
        label="Enunciado"
        multiline
        rows={3}
        value={enunciado}
        onChange={(e) => setEnunciado(e.target.value)}
      />

      <TextField
        label="Lenguaje (python, js, etc)"
        value={metadata.lenguaje ?? ""}
        onChange={(e) =>
          setMetadata({ ...metadata, lenguaje: e.target.value })
        }
      />

      <TextField
        label="Código base / boilerplate"
        value={metadata.boilerplate ?? ""}
        onChange={(e) =>
          setMetadata({ ...metadata, boilerplate: e.target.value })
        }
        multiline
        rows={6}
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
          />
        </Box>
      ))}

      <Button onClick={addTest}>+ Agregar test</Button>
    </Box>
  );
}
