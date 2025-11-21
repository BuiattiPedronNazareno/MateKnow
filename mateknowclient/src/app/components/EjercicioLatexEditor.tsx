"use client";

import React, { useEffect, useRef, useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { Box, TextField, Typography } from "@mui/material";

export default function EjercicioLatexEditor({ value, onChange }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, val: any) => {
    onChange({ ...value, [field]: val });
  };

  useEffect(() => {
    if (!previewRef.current) return;
    setError(null);
    try {
      // @ts-ignore
      window.MathJax.typesetPromise([previewRef.current]).catch(() =>
        setError("Error al renderizar LaTeX")
      );
    } catch {
      setError("Error al renderizar LaTeX");
    }
  }, [value.enunciado]);

  const mathjaxConfig = {
    loader: { load: ["input/tex", "output/chtml"] },
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"]],
    },
  };

  return (
    <MathJaxContext version={3} config={mathjaxConfig}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
       
        <Typography variant="body2" sx={{ color: "#555" }}>
          Para usar el formato LaTeX debes agregar el texto entre <strong>$ ... $</strong>
        </Typography>
       
        <TextField
          label="Enunciado en LaTeX"
          fullWidth
          multiline
          minRows={4}
          value={value.enunciado || ""}
          onChange={(e) => handleChange("enunciado", e.target.value)}
        />

        <Box sx={{ p: 2, border: "1px solid #ccc", borderRadius: 1, minHeight: 80 }}>
          {error ? (
            <Typography color="error">{error}</Typography>
          ) : (
            <div ref={previewRef}>
              <MathJax dynamic>{value.enunciado}</MathJax>
            </div>
          )}
        </Box>
      </Box>
    </MathJaxContext>
  );
}
