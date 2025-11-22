-- versus_resultado
CREATE TABLE IF NOT EXISTS versus_resultado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id text NOT NULL,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  oponente_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  puntaje numeric DEFAULT 0,
  es_ganador boolean DEFAULT false,
  es_empate boolean DEFAULT false,
  clase_id uuid REFERENCES clase(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_versus_resultado_usuario ON versus_resultado(usuario_id);
