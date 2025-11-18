-- SQL para crear tablas y políticas relacionadas con Actividades y Evaluaciones
-- Este script crea tablas necesarias para la HU de Actividades/Evaluaciones
-- Incluye: tipo_ejercicio, ejercicio, opcion_ejercicio, actividad, actividad_ejercicio, actividad_resultado
-- Además contiene policies RLS de ejemplo. Ajusta columnas y roles según tu esquema real.

-- Habilitar extensión para generar UUIDs (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Corrected SQL for actividad/evaluaciones and RLS policies
-- Note: This script assumes public.usuarios, public.clase, public.inscripcion exist as in your DB.

-- Enable extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- tipo_ejercicio
CREATE TABLE IF NOT EXISTS tipo_ejercicio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  created_at timestamptz DEFAULT now()
);

-- ejercicio
CREATE TABLE IF NOT EXISTS ejercicio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_id uuid REFERENCES tipo_ejercicio(id) ON DELETE SET NULL,
  enunciado text NOT NULL,
  puntos numeric DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  creado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_at timestamptz DEFAULT now()
);

-- opcion_ejercicio
CREATE TABLE IF NOT EXISTS opcion_ejercicio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ejercicio_id uuid NOT NULL REFERENCES ejercicio(id) ON DELETE CASCADE,
  texto text NOT NULL,
  is_correcta boolean DEFAULT false
);

-- actividad (single consolidated definition)
CREATE TABLE IF NOT EXISTS actividad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  tipo text NOT NULL DEFAULT 'practica', -- 'evaluacion' | 'practica'
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  is_visible boolean NOT NULL DEFAULT false,
  clase_id uuid NOT NULL REFERENCES clase(id) ON DELETE CASCADE,
  creador_id uuid REFERENCES usuarios(id),
  creado_por uuid REFERENCES usuarios(id), -- keep if you need alternate name; adjust policies accordingly
  created_by uuid REFERENCES usuarios(id),
  created_at timestamptz DEFAULT now()
);

-- actividad_ejercicio
CREATE TABLE IF NOT EXISTS actividad_ejercicio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id uuid NOT NULL REFERENCES actividad(id) ON DELETE CASCADE,
  ejercicio_id uuid NOT NULL REFERENCES ejercicio(id) ON DELETE CASCADE,
  orden integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE (actividad_id, ejercicio_id)
);

-- actividad_resultado (single consolidated definition)
CREATE TABLE IF NOT EXISTS actividad_resultado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id uuid NOT NULL REFERENCES actividad(id) ON DELETE CASCADE,
  clase_id uuid NOT NULL REFERENCES clase(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  registro_id text NOT NULL,
  respuestas jsonb DEFAULT '[]'::jsonb,
  puntaje numeric,
  tiempo_segundos integer,
  estado text DEFAULT 'in_progress',
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_actividad_clase ON actividad(clase_id);
CREATE INDEX IF NOT EXISTS idx_actividad_fecha ON actividad(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_actividad_ejercicio_actividad ON actividad_ejercicio(actividad_id);
CREATE INDEX IF NOT EXISTS idx_resultado_actividad_usuario ON actividad_resultado(actividad_id, usuario_id);

-- -------------------------
-- Row Level Security (RLS) policies
-- NOTE: Postgres does NOT support CREATE POLICY IF NOT EXISTS — use CREATE POLICY only.
-- Enable RLS only after reviewing policies:
-- ALTER TABLE actividad ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE actividad_resultado ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ejercicio ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE opcion_ejercicio ENABLE ROW LEVEL SECURITY;
-- -------------------------

-- Profesor: puede gestionar actividades (creator or enrolled as teacher)
CREATE POLICY actividad_profesor_manage ON actividad
  FOR ALL
  USING (
    (
      EXISTS (
        SELECT 1 FROM clase c
        WHERE c.id = actividad.clase_id AND c.creador_id = auth.uid()
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM inscripcion i
        WHERE i.clase_id = actividad.clase_id AND i.usuario_id = auth.uid() AND i.is_profesor = true
      )
    )
  )
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM clase c
        WHERE c.id = actividad.clase_id AND c.creador_id = auth.uid()
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM inscripcion i
        WHERE i.clase_id = actividad.clase_id AND i.usuario_id = auth.uid() AND i.is_profesor = true
      )
    )
  );

-- Inscritos pueden SELECT actividades de su clase
CREATE POLICY actividad_inscrito_select ON actividad
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inscripcion i
      WHERE i.clase_id = actividad.clase_id AND i.usuario_id = auth.uid()
    )
  );

-- resultado: insert/select/update by owner
CREATE POLICY resultado_insert_own ON actividad_resultado
  FOR INSERT
  WITH CHECK ( usuario_id = auth.uid() );

CREATE POLICY resultado_select_own ON actividad_resultado
  FOR SELECT
  USING ( usuario_id = auth.uid() );

CREATE POLICY resultado_update_own ON actividad_resultado
  FOR UPDATE
  USING ( usuario_id = auth.uid() )
  WITH CHECK ( usuario_id = auth.uid() );

-- Profesores pueden ver resultados de su clase
CREATE POLICY resultado_profesor_select ON actividad_resultado
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clase c
      WHERE c.id = actividad_resultado.clase_id
        AND (
          c.creador_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM inscripcion i
            WHERE i.clase_id = c.id AND i.usuario_id = auth.uid() AND i.is_profesor = true
          )
        )
    )
  );

-- ejercicio: lectura permitida a inscritos/profesores (ensure names match)
CREATE POLICY ejercicio_select_inscrito ON ejercicio
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM actividad_ejercicio ae
      JOIN actividad a on a.id = ae.actividad_id
      JOIN inscripcion i on i.clase_id = a.clase_id
      WHERE ae.ejercicio_id = ejercicio.id AND i.usuario_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM clase c
      WHERE c.id IN (
        SELECT a.clase_id FROM actividad a JOIN actividad_ejercicio ae ON ae.actividad_id = a.id WHERE ae.ejercicio_id = ejercicio.id
      ) AND (
        c.creador_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM inscripcion ii WHERE ii.clase_id = c.id AND ii.usuario_id = auth.uid() AND ii.is_profesor = true
        )
      )
    )
  );

-- opcion_ejercicio: lectura permitida a inscritos/profesores
CREATE POLICY opcion_select_inscrito ON opcion_ejercicio
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ejercicio e
      JOIN actividad_ejercicio ae ON ae.ejercicio_id = e.id
      JOIN actividad a ON a.id = ae.actividad_id
      JOIN inscripcion i ON i.clase_id = a.clase_id
      WHERE e.id = opcion_ejercicio.ejercicio_id AND i.usuario_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM clase c
      WHERE c.id IN (
        SELECT a.clase_id FROM actividad a
        JOIN actividad_ejercicio ae ON ae.actividad_id = a.id
        JOIN ejercicio e ON e.id = ae.ejercicio_id
        WHERE e.id = opcion_ejercicio.ejercicio_id
      ) AND (
        c.creador_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM inscripcion ii WHERE ii.clase_id = c.id AND ii.usuario_id = auth.uid() AND ii.is_profesor = true
        )
      )
    )
  );

-- End of corrected script (See <attachments> above for file contents. You may not need to search or read the file again.)
  fecha_fin timestamptz,
  is_visible boolean not null default false,
  clase_id uuid not null references clase(id) on delete cascade,
  creado_por uuid,
  created_at timestamptz default now()
);

-- Table actividad_ejercicio
create table if not exists actividad_ejercicio (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividad(id) on delete cascade,
  ejercicio_id uuid not null references ejercicio(id) on delete cascade,
  created_at timestamptz default now(),
  unique (actividad_id, ejercicio_id)
);

-- Table actividad_resultado (historial/intent)
create table if not exists actividad_resultado (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividad(id) on delete cascade,
  usuario_id uuid not null,
  respuestas jsonb default '{}'::jsonb,
  puntaje numeric,
  estado text default 'in_progress', -- in_progress | finished
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- Optional: enable RLS and add example policies
-- Enable RLS on actividad (if you want row-level security)
-- ALTER TABLE actividad ENABLE ROW LEVEL SECURITY;

-- Example policy: allow SELECT on actividad only if user is inscribed in the class
-- CREATE POLICY "select_actividades_inscritos" ON actividad
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM inscripcion i
--       WHERE i.clase_id = actividad.clase_id AND i.usuario_id = auth.uid()
--     )
--   );

-- Example policies for actividad_resultado: allow insert/update/select for owner
-- ALTER TABLE actividad_resultADO ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "insert_result_owner" ON actividad_resultado
--   FOR INSERT WITH CHECK (auth.uid()::text = usuario_id::text);
-- CREATE POLICY "select_result_owner" ON actividad_resultado
--   FOR SELECT USING (auth.uid()::text = usuario_id::text);
-- CREATE POLICY "update_result_owner" ON actividad_resultado
--   FOR UPDATE USING (auth.uid()::text = usuario_id::text);

-- Notes:
-- - If you enable RLS, adapt policies for admins/professors accordingly.
-- - Alternatively, keep RLS disabled for these tables in dev and use service role from backend.
