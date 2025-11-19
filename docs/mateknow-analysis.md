# MateKnow - Análisis del proyecto

Última actualización: 2025-11-17

Este documento reúne los tópicos evaluados del proyecto MateKnow: idea central, stack, arquitectura, flujos principales, modelo de datos, observaciones de seguridad, cobertura de funcionalidades, pruebas y recomendaciones.

## 1. Idea central
MateKnow es una aplicación web orientada a alumnos y profesores universitarios para reforzar el aprendizaje mediante ejercicios y la competencia entre pares.

- Los estudiantes resuelven ejercicios y pueden competir contra otros miembros de su clase.
- Se implementan actividades (evaluaciones y prácticas).
- Los profesores crean y validan ejercicios, gestionan clases, y pueden ver el ranking y los resultados.

## 2. Stack tecnológico
Stack confirmado en el repositorio:

- Frontend
  - Next.js 16 (App Router)
  - React 19
  - TypeScript 5.x
  - MUI v7 (`@mui/material`, `@mui/icons-material`, `@emotion`)
  - Sass (`sass`) para estilos
  - Axios para llamadas HTTP
- Backend
  - NestJS (TypeScript)
  - Supabase JS (`@supabase/supabase-js`) — acceso a Postgres y auth
  - Validaciones con `class-validator` y `class-transformer`
  - Pruebas con Jest y Supertest
- Persistencia y Auth
  - Supabase/Postgres con Row-Level Security (RLS)

## 3. Estructura del repositorio (lo relevante)
- `mateknowclient/` -> Frontend Next.js
- `mateknowserver/` -> Backend NestJS
- `mateknowserver/db/` -> Scripts SQL para tablas y políticas

## 4. Componentes principales
- Frontend
  - `app/actividades`, `app/clases`, `app/login`, `app/register`, `app/dashboard`
  - servicios HTTP (`authService`, `claseService`, `actividadService`, `usuarioService`)
  - Gestión de tokens en `localStorage` y interceptores de Axios
  - Componentes MUI para UI (Dialogos, Listas, Buttons, etc.)
- Backend
  - `auth` (validateToken, login, register) — usa Supabase para JWT
  - `clase` (create, join, manage, enroll) — lógica de inscripciones y permisos
  - `actividad` (crear, listar, iniciar intento, guardar respuestas) — usa Supabase
  - `SupabaseService` — wrapper para crear cliente con token o con service role

## 5. Flujos principales
- Registro/Login
  - Frontend envía credenciales -> backend se comunica con Supabase
  - Backend devuelve accessToken/refreshToken y datos de usuario al cliente
- Clases e inscripciones
  - Profesor crea clase con un `codigo` único
  - Usuario puede unirse si la clase es pública
  - Profesor puede matricular alumnos manualmente si la clase es privada
- Actividades/ejercicios
  - Profesor crea actividad y asocia ejercicios
  - Estudiante inicia intento (registro en `actividad_resultado`) y envía respuestas
  - Finalización: backend calcula puntaje y estado
- Historial y ranking
  - Backend expone historial de intentos y se puede calcular ranking por `puntaje`

## 6. Modelo de datos (alto nivel)
- `usuarios`: id, email, nombre, apellido
- `clase`: id, nombre, codigo, creador_id, is_publico
- `inscripcion`: usuario_id, clase_id, is_profesor
- `actividad`: id, nombre, descripcion, tipo, fecha_inicio, fecha_fin, clase_id, is_visible
- `ejercicio`: id, tipo_id, enunciado, puntos, metadata
- `opcion_ejercicio`: id, ejercicio_id, texto, is_correcta
- `actividad_resultado`: id, actividad_id, usuario_id, respuestas, puntaje, estado

## 7. Observaciones de seguridad (hallazgos y recomendaciones)
1. Claves en repo (CRÍTICO)
   - `mateknowserver/.env` contiene `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY`.
   - Recomendación: eliminar claves del repo y mover a un gestor de secretos (GitHub Actions Secrets / Vault). Asegurar que `SUPABASE_SERVICE_ROLE_KEY` solo existe en backend seguro.
2. Uso correcto de roles
   - `SupabaseService` ofrece `getClient(accessToken)` y `getAdminClient()` — es correcto; restringir `getAdminClient` a only internal server usage.
3. RLS
   - `create_actividades_and_policies.sql` incluye policies RLS que aseguran que solo propietarios/inscritos/profesores accedan a datos sensibles. Revisar a fondo en staging.
4. Tokens & LocalStorage
   - El frontend guarda tokens en `localStorage`. Es conveniente considerar HttpOnly cookies si necesitas mayor protección XSS.
5. Logs y secrets
   - Evitar logging de tokens o secrets en logs de producción.

## 8. Cobertura funcional (qué está implementado vs recomendado)
- Crear/Unirse a clase: Implementado (servicio `clase`) ✅
- Crear Actividad: Implementado (servicio `actividad`) ✅
- Inicio / Guardado / Finalizar intento: Implementado (`actividad`) ✅
- Ranking local / Historial: `actividad_resultado` provee datos; endpoint de ranking puede añadirse/optimizarse ✅ (parcial)
- Gestión de roles: Implementado (inscripcion.is_profesor) ✅

## 9. Pruebas
- Backend: Jest + e2e con Supertest están configurados. Añadir pruebas de flujo: crear clase, inscribir alumno, crear actividad, iniciar intento.
- Frontend: no hay tests visibles. Recomendación: agregar tests con Vitest/React Testing Library para los componentes críticos y flujos.

## 10. Variables de entorno y despliegue
- `mateknowclient/.env` contiene `NEXT_PUBLIC_API_URL` (ejemplo `http://localhost:4000`).
- `mateknowserver/.env` contiene supabase keys. NO versionar.
- Despliegue: frontend en Vercel/Netlify; backend en Heroku/Azure/Render/Cloud Run. Proteger variables en settings de despliegue.

## 11. Observaciones de arquitectura y escalabilidad
- Uso de Supabase centraliza DB/Auth — simplifica, pero hay que considerar límites y costs cuando la app crezca.
- Añadir paginación en endpoints que devuelvan listas grandes (`getMisClases`, `listarActividades`).
- Para ranking intensivo, añadir views materializadas, índices y/o servicios asíncronos para calcular agregados.

## 12. Recomendaciones de refactor/clean code
- Consolidar nombres de campos (por ejemplo `creado_por`, `created_by` aparecen en SQL) — homogeneizar.
- Evitar duplicación de claves y mantener DTOs sincronizados con la DB.
- Añadir ejemplos de Postman/Insomnia para endpoints principales.

## 13. Siguientes pasos sugeridos (priorizados)
1. (CRÍTICO) Mover secrets fuera del repo; rotar claves comprometidas.
2. (ALTO) Añadir doc `docs/architecture.md` con endpoints y diagramas de flujo.
3. (ALTO) Tests e2e integrales para validar el flujo completo.
4. (MEDIO) Endpoint de ranking y optimización de consultas.
5. (MEDIO) Evaluar autenticación basada en cookies en lugar de `localStorage` para mayor seguridad.

## 14. Resumen de cobertura y métricas rápidas
- Requisitos principales implementados: 5/6 (faltan endpoints de ranking y algunos tests frontend)
- Tests definidos: Backend unit/e2e configurados — 1/3 pasos completados

## Endpoints relacionados con Actividades
- POST /clases/:claseId/actividades — Crear actividad (body: nombre, descripcion, tipo, fechaInicio, fechaFin, isVisible, ejercicioIds[], nuevosEjercicios[])
- PUT /clases/:claseId/actividades/:actividadId — Editar actividad (actualiza campos y asociaciones de ejercicios)
- DELETE /clases/:claseId/actividades/:actividadId — Eliminar actividad (HARD DELETE de `actividad_resultado` y borrado de asociaciones)
- GET /clases/:claseId/actividades/ejercicios — Listar ejercicios de la clase (ejercicios asociados a actividades de la clase y ejercicios creados por inscritos)

---

¿Deseas que agregue una versión en `docs/architecture.md` con el detalle de endpoints y un diagrama de flujos? También puedo generar el PR con las correcciones sugeridas (no aplicaré cambios sin tu autorización).