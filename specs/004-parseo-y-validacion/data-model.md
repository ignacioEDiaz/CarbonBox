# Data Model: Parseo y validación del CSV

Este spec **no cambia la base de datos** ni las entidades. Agrega dos tipos de resultado en la
capa `application` y reutiliza lo que ya existe.

## Lo que se reutiliza

| Pieza | Spec | Para qué la usa el parser |
|---|---|---|
| `CsvHeader.fromContent(content)` | 003 | Valida la primera línea (FR-003). Mismo mensaje que la subida |
| `ActivityData.create({ uploadId, category, amount, unit, date })` | 002 | Reglas de cada fila (FR-010): categoría y unidad no vacías (las recorta), cantidad mayor que cero, fecha `YYYY-MM-DD` que exista |
| `ValidationError` | 001 | Error de archivo y motivo de cada error de fila |
| `Either` | 001 | Resultado del parser: `Left` si el archivo no se puede procesar, `Right` si sí |

## Tipos nuevos

Viven en `backend/src/document-processing/application/services/ICsvParserService.ts`.

### `RowError`

Un problema de una fila. No es un error del sistema: es información para quien subió el
archivo.

| Campo | Tipo | Regla |
|---|---|---|
| `line` | `number` | Línea del archivo donde **empieza** la fila. El encabezado es la 1 y las líneas vacías también cuentan (FR-012). Siempre ≥ 2 |
| `message` | `string` | Un solo motivo, en español. El primero que falla (research §9) |

### `CsvParseResult`

Lo que devuelve el parser cuando el archivo se pudo leer.

| Campo | Tipo | Regla |
|---|---|---|
| `validRows` | `ActivityData[]` | En el orden del archivo, todas con el `uploadId` recibido (FR-013) |
| `rowErrors` | `RowError[]` | En el orden del archivo, ordenados por `line`, sin límite de cantidad |
| `totalRows` | `number` | Filas de datos: no cuenta el encabezado ni las líneas vacías. Siempre `validRows.length + rowErrors.length` (FR-014) y ≥ 1 (FR-006) |

## Mensajes

Para que los tests y el spec 005 usen el mismo texto.

### Errores de archivo (`Left`)

| Caso | Mensaje |
|---|---|
| No es UTF-8 | `El archivo no es texto UTF-8 válido: guardalo como CSV UTF-8` |
| Encabezado incorrecto | El de `CsvHeader`: `El encabezado debe ser "category,amount,unit,date" y llegó "..."` |
| Sin filas de datos | `El archivo no tiene filas de datos: solo trae el encabezado` |
| Comillas mal cerradas | `El archivo tiene comillas mal cerradas después de la línea N` |

### Errores de fila (`RowError.message`)

| Caso | Mensaje | Quién lo genera |
|---|---|---|
| Columnas ≠ 4 | `La fila tiene N columnas y se esperaban 4` | parser |
| Cantidad con otro formato | `La cantidad "X" no es un número válido: usá solo dígitos y punto decimal (por ejemplo, 12.5)` | parser |
| Categoría vacía | `La categoría no puede estar vacía` | `ActivityData` |
| Unidad vacía | `La unidad no puede estar vacía` | `ActivityData` |
| Cantidad 0 | `La cantidad debe ser un número mayor que cero` | `ActivityData` |
| Fecha inválida | `La fecha "X" no es válida (formato YYYY-MM-DD)` | `ActivityData` |

Orden en una fila: columnas → formato de la cantidad → reglas de `ActivityData` (categoría,
unidad, cantidad > 0, fecha).

## Flujo del parser

```text
bytes ─► ¿UTF-8? ──no──► Left("no es texto UTF-8")
          │sí
          ▼
      CsvHeader ──falla──► Left(mensaje de CsvHeader)
          │ok
          ▼
   \r\n → \n, csv-parse desde la línea 2 ──CsvError──► Left("comillas mal cerradas después de la línea N")
          │
          ▼
   ¿0 filas? ──sí──► Left("no tiene filas de datos")
          │no
          ▼
   por cada fila: ¿4 columnas? ─► ¿cantidad con formato? ─► ActivityData.create
          │                                                    │
          ▼                                                    ▼
      rowErrors  ◄────────── primer motivo que falla       validRows
          │
          ▼
   Right({ validRows, rowErrors, totalRows })
```
