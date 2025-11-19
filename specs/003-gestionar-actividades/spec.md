# Feature Specification: Gestionar Actividades (MateKnow)

**Feature Branch**: `003-gestionar-actividades`  
**Created**: 2025-11-17  
**Status**: Draft  
**Input**: User description: "Yo como profesor quiero crear, modificar, eliminar actividades en mi clase para poner a prueba a mis alumnos en un período de tiempo definido"

## Context
Este documento aplica al proyecto MateKnow (frontend `mateknowclient` + backend `mateknowserver`) y depende de las tablas y políticas definidas en `mateknowserver/db/create_actividades_and_policies.sql` (ver tablas: `actividad`, `actividad_ejercicio`, `actividad_resultado`, `ejercicio`, `opcion_ejercicio`, `clase`, `inscripcion`, `usuarios`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear Actividad (Priority: P1)
El profesor de una clase debe poder crear una actividad dentro de la clase, asociar ejercicios (existentes o crear nuevos), asignar nombre, descripción, visibilidad y (si corresponde) fechas de inicio y fin.

**Why this priority**: Es la operación base que habilita la evaluación y práctica para los alumnos.

**Independent Test**: Usando la UI desde `mateknowclient`, el profesor en su clase clickea "Crear Actividad" y debe ver la actividad persistida (en Supabase `actividad`) y asociada con ejercicios (`actividad_ejercicio`).

**Acceptance Scenarios**:
1. **Given** soy profesor inscrito a la clase, **When** hago click en "Crear Actividad" y completo los datos (nombre, descripción, visibilidad, ejercicios), **Then** la actividad se persiste en la tabla `actividad` y se muestra en la vista de la clase.
2. **Given** soy alumno inscrito a la clase, **When** la actividad está `is_visible=false`, **Then** no debería aparecer en mi lista de actividades ni en la vista (el backend debe filtrar actividades no visibles para alumnos).
2. **Given** creo una actividad de tipo "evaluacion", **When** intento crearla sin `fechaInicio` o `fechaFin`, **Then** el backend (`mateknowserver`) debe devolver error de validación (400) y el frontend mostrar el mensaje apropiado.
3. **Given** elijo crear un nuevo ejercicio desde el modal quick-add, **When** completo los campos mínimos y confirmo, **Then** se guarda en `ejercicio` y se crea la entrada en `actividad_ejercicio`.

4. **UI Note**: En listas o vistas donde aparezcan ejercicios, los ejercicios pertenecientes a una actividad que esté marcada como `is_visible = false` deben mostrarse con un color distintivo (usar la paleta `warning` que ya se usa en la UI para el estado "Oculta") para diferenciar de los ejercicios de actividades visibles.

---

### User Story 2 - Editar Actividad (Priority: P2)
Un profesor puede editar los datos de una actividad existente (nombre, descripción, visibilidad, fechas, ejercicios asociados) desde la UI en `mateknowclient`.

**Why this priority**: Permite ajustar el contenido pedagógico y corregir errores.

**Acceptance Scenarios**:
1. **Given** soy profesor y la actividad existe en `actividad`, **When** edito nombre o descripción y guardo, **Then** los cambios se persisten en `actividad` y se ven inmediatamente.
2. **Given** la actividad es `evaluacion`, **When** guardo sin fechas válidas, **Then** la API devuelve error y el UI bloquea el guardado.
3. **Given** remo asociación de ejercicios, **When** guardo, **Then** se actualiza `actividad_ejercicio` para reflejar los cambios.

---

### User Story 3 - Eliminar Actividad (Priority: P1)
El profesor puede eliminar una actividad y los registros de intentos relacionados, previa confirmación en la UI.

**Acceptance Scenarios**:
1. **Given** soy profesor y la actividad existe, **When** clickeo "Eliminar Actividad", **Then** aparece un modal con el texto: "¿Estás seguro de eliminar la actividad junto a los registros de los usuarios alumnos?" con opciones CANCELAR / CONFIRMAR.
2. **Given** confirmo la eliminación, **When** la operación finaliza, **Then** la fila correspondiente en `actividad` y las filas en `actividad_resultado` que referencian esa actividad son eliminadas (HARD DELETE) y la lista de actividades ya no muestra la actividad.

---

### Edge Cases
- Eliminación concurrente: un alumno puede estar realizando la actividad cuando el profesor borra la actividad; sugerencia: bloquear (o marcar como terminada) la actividad durante proceso de eliminación, o usar transacción para eliminar y notificar.
- Asociaciones inválidas: el backend valida que ejercicios a asociar pertenecen a la misma `clase` via `ejercicio.creado_por` o relación de clase.
- Zonas horarias: fechas `fechaInicio`/`fechaFin` deben normalizarse en UTC en el backend y traducirse según UI.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: El sistema MUST permitir a un usuario con rol `is_profesor` en la tabla `inscripcion` crear una actividad (nombre, descripción, tipo, visibilidad) dentro de la `clase` — mapeado a CA1, CA4, CA6.
- **FR-002**: El sistema MUST permitir asociar uno o varios ejercicios (tabla `ejercicio`) a la actividad desde los ejercicios existentes relacionados con la `clase` — mapeado a CA2.
- **FR-003**: El sistema MUST permitir crear un nuevo ejercicio desde el flujo de creación de actividad (quick-add) y asociarlo a la actividad — mapeado a CA3.
- **FR-004**: El sistema MUST requerir `nombre` y `descripcion` en `CreateActividadDto` y `UpdateActividadDto` — mapeado a CA4.
- **FR-005**: Si `tipo == 'evaluacion'`, el sistema MUST requerir `fechaInicio` y `fechaFin`; validar `fechaInicio < fechaFin` — mapeado a CA5.
- **FR-006**: El sistema MUST permitir marcar `is_visible` al crear y togglear visibilidad posteriormente (actualizar `actividad.is_visible`) — mapeado a CA6, CA7.
- **FR-007**: El sistema MUST permitir al profesor eliminar actividad con confirmación y BORRAR físicamente (`DELETE`) las filas `actividad_resultado` referenciadas — mapeado a CA8, CA9, CA10.
- **FR-008**: El sistema MUST garantizar que solo usuario con `is_profesor` en `inscripcion` o `clase.creador_id` pueda crear/editar/borrar actividades — mapeado a CA1.
- **FR-009**: El sistema MUST rechazar asociaciones de ejercicios que no pertenezcan a la clase (i.e., `ejercicio.creado_por` o `class` vinculante no coincidente) — mapeado a CA2.

### Key Entities
- **Actividad**: (id, nombre, descripcion, tipo, fecha_inicio, fecha_fin, is_visible, clase_id, creador_id)
- **Ejercicio**: (id, tipo_id, enunciado, puntos, metadata, creado_por)
- **ActividadEjercicio**: (actividad_id, ejercicio_id, orden)
- **ActividadResultado**: (id, actividad_id, usuario_id, respuestas, puntaje, estado, started_at, finished_at)

## Success Criteria *(mandatory)*
- **SC-001**: Profesores con `is_profesor` visualizan el botón "Crear Actividad" en su clase y pueden completar un flujo básico (nombre+descripcion) sin errores.
- **SC-002**: Creación de actividad de tipo `evaluacion` falla si falta `fecha_inicio` o `fecha_fin` (validado por unit/integration tests).
- **SC-003**: Actividad creada aparece en la lista de actividades de la clase en el frontend (`mateknowclient`), con sus ejercicios asociados visibles.
- **SC-004**: Al eliminar una actividad y confirmar, todas las filas de `actividad_resultado` con `actividad_id` correspondiente son eliminadas y la actividad no figura en la UI.

## Assumptions
- Implementación por defecto: HARD DELETE (borrado físico) para actividades y actividades_resultado.
- Quick-add del ejercicio tendrá campos mínimos: `enunciado`, `tipo`, `puntos`, `opciones` (si aplica), `metadata` (opcional).
- Se consideran permisos a través de `inscripcion.is_profesor` y `clase.creador_id`.

## Implementation Notes (developer-facing)
- Endpoints: Conectar con `mateknowserver/src/actividad/actividad.service.ts` y completar o extender API actual: `crearActividad`, `editarActividad`, `eliminarActividad`, `listarActividades`.
- DB scripts: `mateknowserver/db/create_actividades_and_policies.sql` ya contiene `actividad`, `actividad_ejercicio` y `actividad_resultado`. Asegurar RLS y políticas coherentes con los controles de profesor.
- Quick-add: crear endpoint `/ejercicios` o usar existing `ejercicio` controller; desde UI crear y al retorno asociar el ejercicio recién creado a `actividad_ejercicio`.

## Test Plan (brief)
- Unit tests para DTOs y servicios.
- e2e: flujo completo — crear clase/login profesor → crear actividad con ejercicios → iniciar intento→ finalizar -> eliminar actividad -> consultar `actividad_resultado` = 0

---

**Spec Ready for Planning**: Sí — adaptada al proyecto MateKnow. Proceder con `/speckit.plan` para crear la lista de tareas y estimaciones.
