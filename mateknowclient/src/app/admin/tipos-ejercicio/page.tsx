import React, { useEffect, useState } from 'react';
import { ejercicioService, TipoEjercicio } from '@/app/services/ejercicioService';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function TiposEjercicioPage() {
  const [tipos, setTipos] = useState<TipoEjercicio[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TipoEjercicio | null>(null);
  const [key, setKey] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<TipoEjercicio | null>(null);

  const loadTipos = async () => {
    try {
      const res = await ejercicioService.obtenerTiposEjercicio();
      setTipos(res.tipos || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTipos();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setKey('');
    setNombre('');
    setDescripcion('');
    setOpen(true);
  };

  const openEdit = (t: TipoEjercicio) => {
    setEditing(t);
    setKey(t.key);
    setNombre(t.nombre);
    setDescripcion(t.descripcion || '');
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await ejercicioService.actualizarTipoEjercicio(editing.id, { nombre, descripcion });
      } else {
        await ejercicioService.crearTipoEjercicio({ key, nombre, descripcion });
      }
      setOpen(false);
      await loadTipos();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await ejercicioService.eliminarTipoEjercicio(deleteCandidate.id);
      setDeleteCandidate(null);
      await loadTipos();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1>Tipos de Ejercicio</h1>
      <Button variant="contained" color="primary" onClick={openCreate}>Crear tipo</Button>
      <List>
        {tipos.map((t) => (
          <ListItem key={t.id}>
            <ListItemText primary={t.nombre} secondary={`${t.key} - ${t.descripcion || ''}`} />
            <ListItemSecondaryAction>
              <IconButton onClick={() => openEdit(t)} aria-label="editar"><EditIcon /></IconButton>
              <IconButton onClick={() => setDeleteCandidate(t)} aria-label="eliminar"><DeleteIcon /></IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{editing ? 'Editar tipo' : 'Crear tipo'}</DialogTitle>
        <DialogContent>
          {!editing && (
            <TextField value={key} onChange={(e) => setKey(e.target.value)} label="Key" fullWidth margin="normal" />
          )}
          <TextField value={nombre} onChange={(e) => setNombre(e.target.value)} label="Nombre" fullWidth margin="normal" />
          <TextField value={descripcion} onChange={(e) => setDescripcion(e.target.value)} label="Descripción" fullWidth margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteCandidate} onClose={() => setDeleteCandidate(null)}>
        <DialogTitle>Eliminar tipo</DialogTitle>
        <DialogContent>
          ¿Eliminar tipo "{deleteCandidate?.nombre}"? Esta acción es irreversible.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCandidate(null)}>Cancelar</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
