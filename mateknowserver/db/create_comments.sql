-- Crear tabla de comentarios
CREATE TABLE IF NOT EXISTS comentario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anuncio_id uuid NOT NULL REFERENCES anuncio(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Índices para optimizar consultas y ordenamiento (CA5)
CREATE INDEX IF NOT EXISTS idx_comentario_anuncio ON comentario(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_comentario_created_at ON comentario(created_at DESC);