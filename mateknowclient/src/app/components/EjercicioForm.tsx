"use client";

import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { Info as InfoIcon } from "@mui/icons-material";
import OpcionField from "./OpcionField";
import {
  ejercicioService,
  TipoEjercicio,
  CreateEjercicioData,
  UpdateEjercicioData,
  Opcion,
} from "@/app/services/ejercicioService";

import EjercicioLatexEditor from "@/app/components/EjercicioLatexEditor";

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
  const [tipoId, setTipoId] = useState(initialData?.tipoId || "");
  const [enunciado, setEnunciado] = useState(initialData?.enunciado || "");
  const [puntos, setPuntos] = useState(initialData?.puntos?.toString() || "1");
  const [isVersus, setIsVersus] = useState(initialData?.isVersus || false);
  const [opciones, setOpciones] = useState<Opcion[]>(
    initialData?.opciones || [
      { texto: "", isCorrecta: false },
      { texto: "", isCorrecta: false },
    ]
  );
  const [tiposEjercicio, setTiposEjercicio] = useState<TipoEjercicio[]>([]);
  const [fetchError, setFetchError] = useState("");
  const [tipoSeleccionado, setTipoSeleccionado] =
    useState<TipoEjercicio | null>(null);

  useEffect(() => {
    const loadTipos = async () => {
      try {
        const response = await ejercicioService.obtenerTiposEjercicio();
        setTiposEjercicio(response.tipos);

        if (initialData?.tipoId) {
          const tipo = response.tipos.find((t) => t.id === initialData.tipoId);
          setTipoSeleccionado(tipo || null);
        }

        if (!initialData?.tipoId && !tipoId && response.tipos.length > 0) {
          setTipoId(response.tipos[0].id);
        }

        if (!response.tipos || response.tipos.length === 0) {
          setTiposEjercicio([]);
          setTipoId("");
          setFetchError("No hay tipos de ejercicio definidos en el servidor.");
          return;
        }
      } catch (err: any) {
        setFetchError(
          err.response?.data?.message ||
            "Error al cargar tipos de ejercicio"
        );
      }
    };

    loadTipos();
  }, []);

  useEffect(() => {
    if (tipoId) {
      const tipo = tiposEjercicio.find((t) => t.id === tipoId);
      setTipoSeleccionado(tipo || null);

      if (tipo?.key === "true_false") {
        setOpciones([
          { texto: "Verdadero", isCorrecta: false },
          { texto: "Falso", isCorrecta: false },
        ]);
      }
    }
  }, [tipoId, tiposEjercicio]);

  const handleAddOpcion = () => {
    setOpciones([...opciones, { texto: "", isCorrecta: false }]);
  };

  const handleRemoveOpcion = (index: number) => {
    if (opciones.length <= 2) return;
    const nuevas = [...opciones];
    nuevas.splice(index, 1);
    setOpciones(nuevas);
  };

  const handleOpcionChange = (
    index: number,
    field: "texto" | "isCorrecta",
    value: any
  ) => {
    const nuevas = [...opciones];
    nuevas[index] = { ...nuevas[index], [field]: value };
    setOpciones(nuevas);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isUuid = (s?: string) =>
      !!s &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

    if (!isUuid(tipoId)) {
      setFetchError("El tipo seleccionado no es válido.");
      return;
    }

    if (!enunciado.trim()) {
      setFetchError("El enunciado es obligatorio");
      return;
    }

    const correctas = opciones.filter((o) => o.isCorrecta).length;

    if (correctas === 0) {
      setFetchError("Debe haber al menos una opción correcta");
      return;
    }

    if (tipoSeleccionado?.key === "true_false" && correctas !== 1) {
      setFetchError("En Verdadero/Falso debe haber exactamente una opción correcta");
      return;
    }

    onSubmit({
      tipoId,
      enunciado: enunciado.trim(),
      puntos: parseInt(puntos) || 1,
      isVersus,
      opciones: opciones.map((o) => ({ ...o, texto: o.texto.trim() })),
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {fetchError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {fetchError}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 3, mb: 3, flexWrap: "wrap" }}>
        <FormControl fullWidth required sx={{ flex: 1 }}>
          <InputLabel id="tipo-select-label">Tipo de Ejercicio</InputLabel>
          <Select
            labelId="tipo-select-label"
            value={tipoId}
            label="Tipo de Ejercicio"
            onChange={(e) => setTipoId(e.target.value)}
            MenuProps={{ disablePortal: true }}
          >
            {tiposEjercicio.map((tipo) => (
              <MenuItem key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Puntos"
          type="number"
          value={puntos}
          onChange={(e) => setPuntos(e.target.value)}
          required
          sx={{ flex: 1 }}
        />
      </Box>

      {/* 🔥 Editor LaTeX SIN título */}
      {tipoSeleccionado?.key === "latex" ? (
        <EjercicioLatexEditor
          value={{ enunciado }}
          onChange={(val: any) => setEnunciado(val.enunciado)}
        />
      ) : (
        <TextField
          label="Enunciado del ejercicio"
          value={enunciado}
          onChange={(e) => setEnunciado(e.target.value)}
          fullWidth
          rows={4}
          multiline
          sx={{ mb: 3 }}
        />
      )}

      {/* 🔥 Opciones SIEMPRE visibles (incluye LaTeX) */}
      <FormControlLabel
        control={
          <Switch
            checked={isVersus}
            onChange={(e) => setIsVersus(e.target.checked)}
          />
        }
        label="Modo Versus"
      />

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
        Opciones de respuesta
      </Typography>

      {tipoSeleccionado?.key === "true_false" ? (
        <RadioGroup
          value={opciones.findIndex((o) => o.isCorrecta).toString()}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setOpciones(
              opciones.map((o, i) => ({ ...o, isCorrecta: i === idx }))
            );
          }}
        >
          {opciones.map((op, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                border: "1px solid #ccc",
                borderRadius: 2,
                mb: 2,
              }}
            >
              <FormControlLabel value={i.toString()} control={<Radio />} />
              <TextField
                value={op.texto}
                onChange={(ev) =>
                  handleOpcionChange(i, "texto", ev.target.value)
                }
                fullWidth
              />
            </Box>
          ))}
        </RadioGroup>
      ) : (
        opciones.map((op, i) => (
          <OpcionField
            key={i}
            opcion={op}
            index={i}
            tipoEjercicio={tipoSeleccionado?.key || ""}
            onChange={handleOpcionChange}
            onRemove={handleRemoveOpcion}
            showRemoveButton
          />
        ))
      )}

      <Button
        variant="outlined"
        fullWidth
        sx={{ my: 2 }}
        onClick={handleAddOpcion}
      >
        + Agregar opción
      </Button>

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        {onCancel && (
          <Button variant="outlined" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="contained">
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            submitButtonText
          )}
        </Button>
      </Box>
    </Box>
  );
}
