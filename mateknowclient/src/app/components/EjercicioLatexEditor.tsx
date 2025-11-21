"use client";

import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { Box, TextField, Typography } from "@mui/material";

interface EjercicioValue {
  enunciado: string;
  [key: string]: any; 
}

interface EjercicioLatexEditorProps {
  value: EjercicioValue;
  onChange: (newValue: EjercicioValue) => void;
}

export default function EjercicioLatexEditor({ value, onChange }: EjercicioLatexEditorProps) {
  
  const handleChange = (field: string, val: string) => {
    onChange({ ...value, [field]: val });
  };

  const mathjaxConfig = {
    loader: { load: ["input/tex", "output/chtml"] },
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"]],
      processEscapes: true, // Permite usar \$ para mostrar el símbolo real
    },
    // Importante: Le decimos que NO intente cargar el script si ya lo pusimos en layout.tsx
    // Si borramos el script del layout, quitar esta línea 'src'.
    src: "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" 
  };

  return (
    <MathJaxContext version={3} config={mathjaxConfig}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        
        <Typography variant="body2" sx={{ color: "#555" }} className="mathjax_ignore">
          Para usar el formato LaTeX debes agregar el texto entre <strong> $ ... $ </strong>
        </Typography>
        
        <TextField
          label="Enunciado en LaTeX"
          fullWidth
          multiline
          minRows={4}
          value={value.enunciado || ""}
          onChange={(e) => handleChange("enunciado", e.target.value)}
        />

        <Box sx={{ p: 2, border: "1px solid #ccc", borderRadius: 1, minHeight: 80, bgcolor: '#fafafa' }}>
            {/* Usamos 'dynamic'. Esto le dice a la librería: 
               "Cuando cambie el contenido, vuelve a renderizar el LaTeX automáticamente".
            */}
            <MathJax dynamic>
              <Typography variant="body1" component="div">
                {value.enunciado || "La vista previa aparecerá aquí..."}
              </Typography>
            </MathJax>
        </Box>
      </Box>
    </MathJaxContext>
  );
}