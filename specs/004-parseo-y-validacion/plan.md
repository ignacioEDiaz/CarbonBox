# Implementation Plan: Parseo y validación del CSV

**Branch**: `004-parseo-y-validacion` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-parseo-y-validacion/spec.md`

## Summary

Un servicio de aplicación, `CsvParserService`, que recibe los bytes de un CSV subido y el id
del upload, y devuelve `Either<ValidationError, CsvParseResult>`:

- **Error de archivo (`Left`)**: no es UTF-8, el encabezado no pasa `CsvHeader` (spec 003),
  comillas mal cerradas o ninguna fila de datos.
- **Resultado (`Right`)**: las filas válidas como entidades `ActivityData` (spec 002), los
  errores por fila con su línea y motivo, y el total.

Lee el CSV con `csv-parse` 7.0.3 (decisión del autor) y reutiliza las reglas que ya existen en
`CsvHeader` y `ActivityData`; lo único nuevo en reglas es el formato estricto de la cantidad.
No toca la base, S3 ni SQS: lo conecta al flujo el spec 005. Todo se prueba con tests
unitarios, test-first.

Ver [research.md](research.md) (todas las decisiones probadas contra la biblioteca real),
[data-model.md](data-model.md), el [contrato](contracts/csv-parser.md) y la
[guía de validación](quickstart.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`) sobre Node.js 24, CommonJS, igual que los
specs anteriores.

**Primary Dependencies**:
- Las de los specs 001 a 003, sin cambios.
- Nueva: `csv-parse` 7.0.3 (MIT, sin dependencias, versión CommonJS incluida; research §1).

**Storage**: N/A. Este spec no lee ni escribe en la base, S3 ni SQS.

**Testing**: unitarios (proyecto `unit`, sin Docker):
- `CsvParserService` con contenidos armados en el test, uno por escenario del spec, más el de
  10 MB (SC-003).
- El contenedor resuelve `csvParserService`.

**Target Platform**: desarrollo local en Windows con Docker Desktop; el parser corre en el
worker (spec 005).

**Project Type**: servicio web (backend).

**Performance Goals**: 10 MB en menos de 10 s (SC-003). Medido en la investigación: 967 ms
para decodificar y parsear 234.687 filas.

**Constraints**:
- `domain` no importa `csv-parse`: la biblioteca solo aparece en `application/services`.
- El handler del 005 dependerá de `ICsvParserService`, no de la clase.
- Sin `any` ni `as`: los tipos de `csv-parse` se usan a través de `on_record`, que viene
  tipado (research §4).
- Sin duplicar reglas: encabezado en `CsvHeader`, fila en `ActivityData`.

**Scale/Scope**: 2 archivos fuente nuevos, 2 modificados (`package.json` y el módulo de DI) y
2 de test (uno nuevo, uno modificado).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple este plan | Estado |
|---|---|---|
| I. DDD + Clean + CQRS | El parser es un servicio de `application` detrás de `ICsvParserService`, registrado en Awilix. Devuelve `Either` y no lanza por errores esperables. Las reglas de negocio siguen en el dominio (`CsvHeader`, `ActivityData`); el parser solo traduce texto a llamadas al dominio. No hay command ni query nuevos: llegan en el 005. | ✅ |
| II. Estructura de la consigna | `application/services/CsvParserService.ts`, tal cual el árbol. Desvío justificado abajo: `ICsvParserService.ts` en la misma carpeta. | ✅ con desvío justificado |
| III. TDD | Cada escenario del spec entra como test que falla antes del código (rojo → verde). Es el bonus "tests unitarios del parser" de la consigna. | ✅ |
| IV. Legible y mínimo | Una dependencia nueva, pedida por el autor y justificada (research §1). Funciones cortas: decodificar, leer filas, validar una fila, convertir la cantidad. Sin opciones "por si acaso". | ✅ |
| V. Punta a punta | Deja lista la pieza que el worker necesita; el 005 la conecta. El criterio de "listo" del plan general (filas rotas devuelven válidas y errores por separado) se verifica con tests. | ✅ |
| Restricciones | Sin cambios en Docker, configuración ni base. | ✅ |

**Re-check post diseño:** sin violaciones nuevas. El diseño de la fase 1 no agrega capas ni
dependencias fuera de las de arriba.

## Project Structure

### Documentation (this feature)

```text
specs/004-parseo-y-validacion/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── csv-parser.md        # ICsvParserService, RowError, CsvParseResult
└── tasks.md                 # lo genera /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── package.json                             # + csv-parse 7.0.3
├── src/
│   └── document-processing/
│       ├── application/
│       │   └── services/
│       │       ├── ICsvParserService.ts     # nuevo: interfaz, RowError, CsvParseResult
│       │       └── CsvParserService.ts      # nuevo: la implementación
│       └── infrastructure/
│           └── dependency-injection/
│               └── DocumentProcessingModule.ts  # + csvParserService
└── tests/
    └── unit/
        ├── main/container.test.ts           # + resuelve csvParserService
        └── document-processing/
            └── application/
                └── services/
                    └── CsvParserService.test.ts  # nuevo
```

**Structure Decision**: se estrena `application/services/`, la carpeta que la consigna prevé
para `CsvParserService` y `FileProcessingService` (este último llega en el 005). La interfaz va
al lado de la implementación porque es un contrato de la capa de aplicación: la usa el handler
del 005, que también es de aplicación.

### Cómo queda `CsvParserService` (esqueleto, no es el código final)

```text
parse(content, uploadId)
  decodeUtf8(content)          → Left si no es UTF-8                   (research §6)
  CsvHeader.fromContent(...)   → Left con el mensaje de la subida       (FR-003)
  readRows(text)               → Left si hay comillas mal cerradas      (research §2 a §5)
                                 cada fila: { fields, line }
  si no hay filas              → Left "no tiene filas de datos"         (FR-006)
  por cada fila: toActivityData(row, uploadId)
                               → ActivityData o RowError                (research §8 y §9)
  Right({ validRows, rowErrors, totalRows })
```

## Orden de implementación

| Fase | Historia | Qué queda funcionando |
|---|---|---|
| A | Base | `csv-parse` 7.0.3 instalado; `ICsvParserService` con sus tipos; `CsvParserService` vacío registrado en Awilix y el test del contenedor. **Checkpoint:** `npm run test:unit` y `tsc` en verde |
| B | US1 | Test-first: filas válidas, cada motivo de error de fila con su línea, columnas, formato de la cantidad, un motivo por fila, espacios, totales, mismo resultado dos veces. **Checkpoint:** un CSV con filas rotas devuelve válidas y errores por separado (criterio de "listo") |
| C | US2 | Test-first: UTF-8, encabezado (incluido punto y coma y la tolerancia de `CsvHeader`), sin filas, comillas mal cerradas. **Checkpoint:** cada caso devuelve un solo `Left` y ninguna fila |
| D | US3 | Test-first: comillas con comas y comillas escapadas, `\n` contra `\r\n`, líneas vacías y de espacios con la numeración correcta, fila de varias líneas. **Checkpoint:** mismos resultados con las distintas formas de escribir el archivo |
| E | Cierre | Test de 10 MB (SC-003), quickstart completo, README (decisiones del parser) y `USO-DE-IA.md` |

US1 va primero aunque el parser necesite leer el CSV para todo: en la fase B se implementa la
lectura básica (`\n`, sin comillas) y la fase D agrega los casos del estándar con sus tests.

## Complexity Tracking

| Agregado o desvío | Por qué hace falta | Alternativa más simple descartada porque |
|---|---|---|
| Dependencia `csv-parse` 7.0.3 | Decisión del autor: leer el CSV según el estándar (comillas con comas, comillas escapadas, valores de varias líneas) | `split(",")` es más corto pero marca como inválida una fila correcta con una coma entre comillas |
| `ICsvParserService.ts` (no está en el árbol de la consigna) | La constitución pide que los handlers dependan de interfaces; el handler del 005 lo va a recibir por constructor | Depender de la clase concreta viola el principio I y no deja usar un doble en el test del handler |
| Normalizar `\r\n` a `\n` antes de parsear | Con `\r\n` y líneas en blanco, la biblioteca corre los números de línea (probado, research §3) | Dejarlo como viene da líneas equivocadas en los errores (falla SC-002) |
| Calcular la línea de inicio con `on_record` | La biblioteca da la línea donde termina la fila, y una fila puede ocupar varias líneas (research §4) | `info` y `raw` obligan a forzar tipos; `raw` además tiene el tipo mal declarado |
| Error de comillas "después de la línea N" en vez de la línea exacta | Con una comilla sin cerrar, la biblioteca solo informa el final del archivo (research §5) | No hay forma confiable de saber la línea exacta sin escribir un parser propio |

## Fuera de este plan

- **Conectar el parser al flujo** (leer de SQS, bajar de S3, guardar filas, cambiar estados):
  spec 005.
- **Qué estado toma el upload si todas las filas son inválidas** y **dónde se guardan los
  errores por fila** (hoy `Upload` solo tiene `errorMessage`): se decide en el 005. El parser
  ya devuelve todo lo necesario para cualquiera de las opciones.
- **`USO-DE-IA.md`**: registrar que el spec y el plan se hicieron con Claude Code y que las
  decisiones de la biblioteca salieron de pruebas reales: el corrimiento de líneas con `\r\n`,
  el tipo mal declarado de `raw` y la línea que informa una comilla sin cerrar.
