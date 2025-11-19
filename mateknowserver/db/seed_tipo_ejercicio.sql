-- Seed defaults for tipo_ejercicio
INSERT INTO tipo_ejercicio (key, nombre, descripcion)
VALUES
  ('multiple-choice', 'Multiple Choice', 'Preguntas con múltiples opciones (MCQ)'),
  ('true_false', 'Verdadero / Falso', 'Preguntas con dos opciones: Verdadero o Falso'),
  ('abierta', 'Abierta', 'Preguntas abiertas donde el alumno escribe la respuesta');

-- Use ON CONFLICT DO NOTHING to avoid duplicate seeds if applicable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tipo_ejercicio WHERE key='multiple-choice') THEN
    INSERT INTO tipo_ejercicio (key, nombre, descripcion) VALUES ('multiple-choice', 'Multiple Choice', 'Preguntas con múltiples opciones (MCQ)');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tipo_ejercicio WHERE key='true_false') THEN
    INSERT INTO tipo_ejercicio (key, nombre, descripcion) VALUES ('true_false', 'Verdadero / Falso', 'Preguntas con dos opciones: Verdadero o Falso');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tipo_ejercicio WHERE key='abierta') THEN
    INSERT INTO tipo_ejercicio (key, nombre, descripcion) VALUES ('abierta', 'Abierta', 'Preguntas abiertas donde el alumno escribe la respuesta');
  END IF;
END $$;
