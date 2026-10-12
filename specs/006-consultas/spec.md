# Feature Specification: Consultas

**Feature Branch**: `006-consultas`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "Los dos endpoints de lectura que faltan de la consigna: la lista
paginada de uploads del usuario (`GET /api/v1/uploads?page=1&limit=10` → `{ data, total, page,
limit }`) y los datos procesados de un upload (`GET /api/v1/uploads/:id/results` → `{ data:
[{ category, amount, unit, date }] }`). Con esto los cuatro endpoints responden con el formato
de la consigna."

## Clarifications

### Session 2026-10-11

- Q: ¿Qué valores de paginación se usan? → A: `page` empieza en 1 y por defecto es 1; `limit`
  por defecto es 10 (la consigna pide 10 por página) y como máximo 100. Un valor que no es un
  entero positivo, o un `limit` mayor que 100, es un error de validación (400) que explica el
  rango, en vez de corregirlo en silencio.
- Q: ¿En qué orden? → A: La lista, del upload más nuevo al más viejo (lo que acaba de subir la
  persona aparece primero). Los resultados, por fecha y después por categoría.
- Q: ¿Qué trae cada upload de la lista? → A: Lo mismo que la consulta por id (estado, nombre,
  conteos, mensaje de error, fechas), sin la ubicación interna del archivo ni el usuario.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la lista de mis uploads (Priority: P1)

La persona ve sus uploads, de a 10 por página, con el estado de cada uno, y sabe cuántos tiene
en total para poder pasar de página.

**Why this priority**: es la pantalla principal del frontend (spec 007) y un endpoint
obligatorio.

**Independent Test**: subir 12 archivos y pedir la página 1 y la 2.

**Acceptance Scenarios**:

1. **Given** 12 uploads del usuario, **When** se pide la lista sin parámetros, **Then** llegan
   los 10 más nuevos, `total` 12, `page` 1 y `limit` 10.
2. **Given** los mismos 12, **When** se pide `page=2`, **Then** llegan los 2 más viejos.
3. **Given** una página más allá del final, **When** se pide, **Then** `data` vacío y el
   `total` real.
4. **Given** `page=0`, `page=abc`, `limit=0` o `limit=101`, **When** se pide, **Then** 400 con
   un mensaje que dice el rango válido.
5. **Given** uploads de otro usuario en la base, **When** se pide la lista, **Then** no
   aparecen.

---

### User Story 2 - Ver los datos procesados de un upload (Priority: P1)

La persona ve las filas válidas que se guardaron de su archivo.

**Why this priority**: es el resultado de todo el procesamiento y un endpoint obligatorio.

**Independent Test**: procesar un CSV y pedir sus resultados.

**Acceptance Scenarios**:

1. **Given** un upload procesado con 2 filas válidas, **When** se piden sus resultados,
   **Then** `data` trae las 2 con `category`, `amount` (número), `unit` y `date`
   (`YYYY-MM-DD`), ordenadas por fecha.
2. **Given** un upload todavía no procesado o sin filas válidas, **When** se piden, **Then**
   `data` vacío.
3. **Given** un identificador que no existe, **When** se piden, **Then** "no encontrado".

### Edge Cases

- Dos uploads con la misma fecha de creación: el orden entre ellos es estable (desempata el
  identificador), así ninguno se repite ni se pierde entre páginas.
- Los resultados no incluyen identificadores internos ni el upload al que pertenecen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La lista MUST devolver solo los uploads del usuario, del más nuevo al más viejo,
  con `{ data, total, page, limit }`.
- **FR-002**: `page` (por defecto 1) y `limit` (por defecto 10, máximo 100) MUST ser enteros
  positivos; si no, error de validación.
- **FR-003**: Cada elemento de la lista MUST tener el mismo formato que la consulta por id.
- **FR-004**: Los resultados MUST devolver `{ data: [{ category, amount, unit, date }] }` del
  upload, ordenados por fecha y categoría; "no encontrado" si el upload no existe.
- **FR-005**: Las lecturas MUST ser queries con su handler (CQRS) y tener pruebas automáticas.

## Success Criteria *(mandatory)*

- **SC-001**: Los cuatro endpoints de la consigna responden con su formato.
- **SC-002**: Recorrer las páginas nunca repite ni saltea uploads.
- **SC-003**: Todos los escenarios tienen una prueba automática y todas pasan.

## Assumptions

- Sin autenticación: el usuario es `user-123`, como en la subida.
- Los resultados se devuelven completos, sin paginar (un upload tiene como máximo lo que entra
  en 10 MB).
