---

description: "Lista de tareas del spec 004-parseo-y-validacion"
---

# Tasks: Parseo y validación del CSV

**Input**: Documentos de diseño en `specs/004-parseo-y-validacion/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/csv-parser.md](contracts/csv-parser.md),
[quickstart.md](quickstart.md)

**Tests**: TDD con Jest (principio III de la constitución y FR-018). Cada comportamiento entra
primero como test que DEBE fallar y después se implementa. Todo va en el proyecto `unit`, sin
Docker.

**Commits**: un commit por par test + implementación, siempre con la suite en verde. Se
verifica con el código de salida de Jest, no con un `grep` del resumen.

**Organization**: tareas agrupadas por historia de usuario del spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1 a US3)
- Rutas relativas a la raíz del repositorio. `DP` = `backend/src/document-processing`,
  `TDP` = `backend/tests/unit/document-processing`

---

## Phase 1: Setup

**Purpose**: la dependencia nueva.

- [X] T001 En `backend/` instalar con versión exacta: `npm install --save-exact csv-parse@7.0.3` (research §1). Verificar que `npm run test:unit` y `npx tsc --noEmit` siguen en verde.

---

## Phase 2: Foundational

**Purpose**: el contrato que van a usar la implementación y el handler del 005.

- [X] T002 Crear `DP/application/services/ICsvParserService.ts` tal cual [contracts/csv-parser.md](contracts/csv-parser.md): tipos `RowError { line: number; message: string }` y `CsvParseResult { validRows: ActivityData[]; rowErrors: RowError[]; totalRows: number }`, e interfaz `ICsvParserService` con `parse(content: Uint8Array, uploadId: string): Either<ValidationError, CsvParseResult>`. Un comentario de una línea por tipo. `npx tsc --noEmit` en verde.

**Checkpoint**: el contrato compila.

---

## Phase 3: User Story 1 - Separar filas válidas e inválidas, con línea y motivo (Priority: P1) 🎯 MVP

**Goal**: un CSV con encabezado correcto devuelve las filas válidas, los errores por fila
(línea y motivo) y el total.

**Independent Test**: `npm run test:unit -- CsvParserService` con un CSV de filas buenas y malas
mezcladas.

- [X] T003 [US1] Crear `TDP/application/services/CsvParserService.test.ts` con un helper `csv(...lines: string[]): Buffer` (une con `\n` y agrega el salto final) y un helper que hace `parse` y falla el test si devuelve `Left`. Escenarios de US1 (spec):
  - Tres filas correctas: tres `ActivityData` con `category`, `amount` como número, `unit`, `date` y el `uploadId` recibido; `rowErrors` vacío; `totalRows` 3.
  - Categoría vacía en la línea 3: `{ line: 3, message: "La categoría no puede estar vacía" }` y las otras filas siguen.
  - `it.each` de cantidades: `0` (mensaje de `ActivityData`), `-5`, `abc`, `12,5` entre comillas, `1e3`, `0x10`, `+5`, `.5`, `5.`, `12kg` y vacía (mensaje de formato de data-model.md con el valor recibido).
  - `it.each` de fechas: `2024-02-31`, `2024-13-01`, `31/01/2024`, `2024-1-5` y vacía (mensaje de `ActivityData` con la fecha).
  - Unidad vacía.
  - 3 y 5 columnas: `La fila tiene 3 columnas y se esperaban 4` y `... 5 columnas ...`.
  - Fila con categoría vacía y fecha inválida: un solo error.
  - Espacios alrededor de los valores: válida y sin espacios (` Electricidad , 12.5 , kWh , 2024-03-01 `).
  - `0007` vale 7.
  - Válidas + errores = total en un archivo mezclado.
  - Mismo contenido dos veces: mismos valores (sin comparar `id`), mismos errores, mismo total.

  Verificar que falla (el módulo no existe).
- [X] T004 [US1] Implementar `DP/application/services/CsvParserService.ts` (`implements ICsvParserService`), con funciones cortas:
  - `readRows(text)`: `parse` de `csv-parse/sync` con `from_line: 2`, `skip_empty_lines: true`, `trim: true`, `relax_column_count: true` y `on_record` que junta `{ fields, line: context.lines }` en un array (research §2 y §4). El valor que devuelve `parse` no se usa.
  - `toActivityData(row, uploadId)`: cantidad de columnas → `parseAmount` → `ActivityData.create`; devuelve `Either<ValidationError, ActivityData>`.
  - `parseAmount(text)`: `/^\d+(\.\d+)?$/` y `Number()`, o `Left` con el mensaje de formato (research §8).
  - `parse(content, uploadId)`: por ahora decodifica con `TextDecoder` (sin `fatal`, lo agrega US2), llama a `readRows` y clasifica cada fila en `validRows` o `rowErrors`.

  T003 en verde. Commit.
- [X] T005 [US1] Registrar `csvParserService: asClass(CsvParserService).singleton()` en `DP/infrastructure/dependency-injection/DocumentProcessingModule.ts` y agregar a `backend/tests/unit/main/container.test.ts` que resuelve un `CsvParserService` (primero el test, verlo fallar). `npm run test:unit` en verde. Commit.

**Checkpoint**: un CSV con filas rotas devuelve válidas y errores por separado (criterio de
"listo" del plan general).

---

## Phase 4: User Story 2 - Rechazar un archivo que no se puede procesar (Priority: P2)

**Goal**: los problemas de archivo entero devuelven un solo `Left` y ninguna fila.

**Independent Test**: `npm run test:unit -- CsvParserService` con los archivos de US2.

- [X] T006 [US2] Agregar a `CsvParserService.test.ts` un `describe` de errores de archivo, cada uno comprobando que es `Left` con un `ValidationError` y el mensaje de data-model.md:
  - Encabezados incorrectos (`it.each`): otro orden, columna de más, columna de menos, separado por punto y coma, una fila de datos como primera línea. Mensaje de `CsvHeader`.
  - Encabezado `Category, Amount ,UNIT,date`, con `\r\n` y con BOM (`﻿`): se acepta (`Right`).
  - Solo el encabezado; encabezado y líneas vacías: `El archivo no tiene filas de datos: solo trae el encabezado`.
  - Bytes que no son UTF-8 (`Buffer.from([...encabezado, 0x0a, 0x63, 0xe9, 0x2c, ...])`): `El archivo no es texto UTF-8 válido: guardalo como CSV UTF-8`.
  - Comilla sin cerrar en la línea 4 después de una fila buena en la línea 2 y una vacía en la 3: `El archivo tiene comillas mal cerradas después de la línea 2`.
  - Comilla sin cerrar en la primera fila de datos: `... después de la línea 1`.
  - Texto después de la comilla de cierre (`"abc"x,1,kWh,2024-01-01`): `... después de la línea 1`.

  Verificar que fallan.
- [X] T007 [US2] Implementar en `CsvParserService.ts`, en el orden de research §9:
  - `decodeUtf8(content)`: `new TextDecoder("utf-8", { fatal: true })`; si lanza `TypeError`, `Left` con el mensaje de UTF-8 (research §6).
  - `CsvHeader.fromContent(content)`: si es `Left`, se devuelve tal cual (FR-003).
  - En `readRows`, capturar solo `CsvError` y devolver `Left` con `después de la línea N`, donde N es el `line` final de la última fila leída o 1 (research §5). Cualquier otro error se relanza. `readRows` pasa a devolver `Either`.
  - Si no hay filas: `Left` con el mensaje de sin filas (FR-006).

  T006 en verde y T003 sigue en verde. Commit.

**Checkpoint**: cada problema de archivo devuelve un solo error claro y ninguna fila.

---

## Phase 5: User Story 3 - Leer el CSV según el estándar (Priority: P3)

**Goal**: el mismo contenido escrito de distintas formas da el mismo resultado, con los
números de línea correctos.

**Independent Test**: `npm run test:unit -- CsvParserService` con el mismo contenido en varias
formas.

- [X] T008 [US3] Agregar a `CsvParserService.test.ts` un `describe` del formato estándar:
  - `"Oficina, piso 2"`: válida, categoría `Oficina, piso 2`.
  - `"Sala ""A"""`: válida, categoría `Sala "A"`.
  - Comilla suelta en un valor sin comillas (`Sala "A`): válida, categoría `Sala "A` (research §5).
  - Mismo contenido con filas rotas, líneas vacías y líneas de solo espacios, escrito con `\n` y con `\r\n`: resultados iguales y líneas de error iguales a las del archivo (research §3).
  - Fila con un valor entre comillas que ocupa las líneas 3 a 5 y una fila rota en la línea 6: la de varias líneas se informa en la línea 3 si tiene error, y la siguiente en la 6 (research §4).
  - Líneas vacías y de solo espacios en el medio y al final: no cuentan en `totalRows`.

  Verificar cuáles fallan (se espera: `\r\n` con líneas vacías, la fila de varias líneas y la comilla suelta). Resultado real: `\r\n` con líneas vacías ya pasaba; el corrimiento aparece con `\r\n` dentro de una fila de varias líneas, así que ese test se hizo con `\n` y con `\r\n` (research §3 corregido).
- [X] T009 [US3] Implementar en `CsvParserService.ts`:
  - Reemplazar `\r\n` por `\n` antes de `readRows` (research §3).
  - `relax_quotes: true` en las opciones (research §2).
  - La línea de cada fila pasa a ser la de inicio: `context.lines` menos los saltos de línea dentro de sus valores (research §4), en una función `startLine(fields, context)` con su comentario.

  T008 en verde y el resto sigue en verde. Commit.

**Checkpoint**: todas las historias funcionan.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T010 Agregar a `CsvParserService.test.ts` el test de SC-003: genera un CSV de 10 MB con filas válidas (como en research §7), lo procesa y comprueba que tarda menos de 10 s y que `totalRows` coincide con las filas generadas. Timeout propio de 30 s. Commit.
- [ ] T011 Recorrer [quickstart.md](quickstart.md): `npm run test:unit` (código de salida 0), `npx tsc --noEmit` y la prueba a mano con `npx tsx`. Corregir la guía si algún comando o salida no coincide.
- [ ] T012 [P] Actualizar `README.md`: qué hace el parser, el formato que acepta (UTF-8, coma, encabezado, cantidad estricta), los errores de archivo y de fila, y las decisiones probadas (biblioteca, `\r\n`, línea de inicio, comillas). Actualizar en `CLAUDE.md` los pendientes del 005 (estado si todas las filas son inválidas y dónde se guardan los errores por fila).
- [ ] T013 [P] Actualizar `USO-DE-IA.md`: implementación del 004 (qué generó la IA, qué se corrigió) y la línea del parser en "¿Qué Generé con IA?".

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002)** → **US1 (T003–T005)** → **US2 (T006–T007)** →
  **US3 (T008–T009)** → **Polish (T010–T013)**.
- Todas las historias tocan el mismo archivo de implementación y el mismo de test, así que van
  en serie. US2 y US3 no dependen entre sí en comportamiento, pero sí en el archivo.
- T012 y T013 se pueden hacer en paralelo (archivos distintos).

## Parallel Example

```text
# Al final, en paralelo:
T012 README.md y CLAUDE.md
T013 USO-DE-IA.md
```

## Implementation Strategy

- **MVP = US1** (T001–T005): ya cumple el criterio de "listo" del plan general con archivos
  bien formados.
- US2 vuelve robusto el camino excepcional; US3 cubre las formas de escribir el CSV que no son
  las del caso común.
- Cada fase termina con la suite en verde y un commit.
