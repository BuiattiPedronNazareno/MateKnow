# Tasks: Gestionar Actividades — MateKnow

**Goal**: Implementar HU "Gestionar Actividades" (crear, editar, eliminar actividades) en MateKnow.

Notas: - Excluimos desarrollo de tests por falta de tiempo (instr. del PO). - Prioridad: crear y eliminar actividades + quick-add ejercicios.

## Sprint estimate summary
- Total rough estimate: 4.5 - 6.5 días (36-52 horas) según complejidad de UI/UX y revisión de seguridad.

## Tasks (ordered, minimal increments)

1) Task: DB & Policies validation (0.5 days / 4 hrs)
- Verificar que `actividad_resultado` tenga `ON DELETE CASCADE` para `actividad_id` (ya presente en SQL).
- Si no existiera, agregar FK con CASCADE o un trigger para asegurar HARD DELETE.
- Revisión de policies RLS en `create_actividades_and_policies.sql` para confirmar que solo `inscripcion.is_profesor` o `clase.creador_id` puede administrar `actividad`.
Deliverable: Confirmación y/o patch SQL con brief PR notes.

2) Task: Backend - Endpoints y DTOs (1.0 día / 8 hrs) [X]
- Revisar `mateknowserver/src/actividad/actividad.service.ts` y `controller`.
- Implementar/ajustar endpoints: POST `/clases/:claseId/actividades` (crear), PUT `/clases/:claseId/actividades/:actividadId` (editar), DELETE `/clases/:claseId/actividades/:actividadId` (borrar).
- `CreateActividadDto` y `UpdateActividadDto`: validar `nombre`, `descripcion` obligatorios; si `tipo === 'evaluacion'` => `fechaInicio` y `fechaFin` obligatorios y `fechaInicio < fechaFin`.
- En creación, aceptar `ejercicioIds[]` y `nuevosEjercicios[]` (quick-add objects). Para cada `nuevoEjercicio`, crear en tabla `ejercicio` y luego asociar en `actividad_ejercicio`.
- En eliminación, confirmar el uso de `ON DELETE CASCADE` (o en el servicio, ejecutar eliminación de `actividad_resultado` explícita si necesario). Implementar soft atomic transaction para evitar partial deletes.
Deliverable: API endpoints and DTOs updated, controller methods implemented.

3) Task: Backend - Permissions & Validation (0.5 days / 4 hrs) [X]
- Añadir comprobación que `req.user.id` esté inscrito como `is_profesor` para la `clase` o que sea `clase.creador_id`.
- Verificar que `ejercicioIds` que vienen en payload pertenecen a la misma `clase` (select + equals `clase_id`). Rechazar con 400 si alguno no coincida.
- En quick-add, asignar `creado_por` como `req.user.id` y `clase_id` (si aplica).
Deliverable: Security validation in controller/service.

4) Task: Backend - Quick-add of Ejercicio (0.5 days / 4 hrs) [X]
- Endpoint/flow: When creating activity, handle `nuevosEjercicios[]` payload items.
- Validate minimal fields: `enunciado`, `tipo`, `puntos`, `opciones` for MCQ.
- Create rows in `ejercicio` + `opcion_ejercicio` (for MCQ), then create `actividad_ejercicio` linking them in correct order.
Deliverable: Quick-add successfully stores exercises and associations in DB.

5) Task: Frontend - UI/UX Crear Actividad (1.0 - 1.25 días / 8 - 10 hrs) [partial]
- In `mateknowclient` add/create or update `app/clases/[id]` or `actividades` pages to include "Crear Actividad" button visible only for `inscripcion.is_profesor`.
- Build a modal or page for creation that allows: `nombre`, `descripcion`, `tipo` (`practica|evaluacion`), `fechaInicio`, `fechaFin`, `is_visible`, `ejercicioIds[]` multi-select from class's exercises, and `quick-add` new ejercicio option.
- If `tipo === 'evaluacion'` validate dates on UI and show message before call.
- On submit, call POST to backend with DTO described.
Deliverable: UI flow + client call with token header.

- UI - Visual differentiation for hidden exercises (0.25 days / 2 hrs)
	- In `app/clases/[id]`, use a `warning` color to visually differentiate exercises that belong to an activity marked `is_visible === false` (use `Chip` + color and/or `ListItem` styling). Add accessibility label for screen readers.
	- In `app/actividades/[claseId]`, color activity entries and maintain the `Oculta` chip for visual clarity.
	Deliverable: Hidden exercises/activities are visually distinct using existing UI colors.

6) Task: Frontend - Editar / Eliminar Actividad (0.75 - 1.0 días / 6 - 8 hrs) [partial]
- Add Edit action (opens form prefilled). Send PUT to backend with changed fields.
- Add Delete action with confirmation modal message from CA9. On confirm, call DELETE endpoint.
- After delete, refresh list and show success message.
Deliverable: Edit and Delete flows working on UI.

7) Task: Frontend - Quick-add ejercicio UX (0.5 days / 4 hrs) [X]
- Quick-add modal flow: minimal fields as specified. Validate MCQ options.
- On quick-add success, add new exercise to the multi-select and auto-associate it client-side.
 - Added `tipo` selector and `OptionsEditor` component to handle MCQ options in UI.
 - Validations implemented: MCQ requires >= 2 options and at least one correct.
Deliverable: Quick-add integrated in Crear/Editar flows.

8) Task: Security & Env / Config (0.25 days / 2 hrs)
- Confirm `SUPABASE_SERVICE_ROLE_KEY` is not exposed in frontend.
- Confirm server uses service role for admin operations only; verify env variables and `.env` handling.
Deliverable: Short PR notes + configuration mention.

9) Task: Documentation & QuickStart (0.25 days / 2 hrs)
- Update `README.md` and `docs/mateknow-analysis.md` with new endpoints and admin flows.
Deliverable: docs update and links to endpoints.

10) Task: Manual QA & Release ready checks (0.5 days / 4 hrs)
- Manual smoke test of all flows (UI create/edit/delete + DB check for cascade delete).
- Confirm RLS policies not broken by feature.
Deliverable: Sign-off from PO / PR review.

## Acceptance criteria for tasks
- Backend must enforce that only professors can create/edit/delete activities.
- Quick-add must validate minimal fields before saving.
- Deleting an activity removes `actividad_resultado` rows (HARD DELETE) and activity no longer appears.
- UI must hide "Crear Actividad" button for non-professors.
 - Backend must filter activities: non-professors (alumnos) should only receive `is_visible=true` activities when calling `listarActividades`. This prevents students from seeing hidden activities. (Add test to validate behavior.)

## Timeline / Allocation
- If 1 developer working full-time on this HU: 4.5 working days (about 36 hours) to implement but not test with automated tests; ~6.5 days if UX polishing required and PR review delays.

## Notes / Risks
- If FK cascade is missing in DB, small script is required (low-risk) but needs downtime or migration window for production.
- Race condition on delete if a student is mid-attempt — consider locking or marking activity as deleted during deletion window.
- Quick-add complexity: saving `ejercicio` and associating must be atomic; use DB transaction.

---

Si te parece bien, lo guardo como `specs/003-gestionar-actividades/tasks.md` en MateKnow y genero un plan de subtareas por día (sprint). ¿Confirmas?  (No incluí tests automáticos por pedido).