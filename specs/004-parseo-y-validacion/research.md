# Research: Parseo y validación del CSV

Decisiones técnicas del spec 004. Todo lo que dice "probado" se verificó el 2026-10-11 con
`csv-parse` 7.0.3 instalado en una carpeta aparte (fuera del repo), con Node 24 y el
TypeScript 6.0.3 del backend con las mismas opciones del `tsconfig.json`.

## 1. Biblioteca para leer el CSV: `csv-parse` 7.0.3

- **Decision**: `csv-parse` 7.0.3, con la API síncrona `csv-parse/sync`.
- **Rationale**:
  - Implementa el estándar CSV (RFC 4180): comillas con comas adentro, comillas dobles
    escapadas y valores que ocupan varias líneas (probado).
  - Licencia MIT, **sin dependencias**, mantenida (7.0.3 publicada el 2026-09-25, más de dos
    semanas antes de este plan).
  - Trae una versión CommonJS (`exports.require` → `dist/cjs/sync.cjs`), que es lo que usa el
    backend. Con `moduleResolution: "bundler"` el import `csv-parse/sync` compila sin cambios
    en el `tsconfig.json` (probado con `tsc`).
  - Exporta `CsvError` con un `code` estable para distinguir errores de formato.
- **Alternatives considered**:
  - `split(",")` a mano: descartado por decisión del autor (spec, Clarifications): rompe con
    una coma entre comillas.
  - `papaparse`: muy usada, pero pensada para el navegador; su API de errores no tira
    excepciones con código, devuelve una lista que habría que interpretar.
  - API por streams de `csv-parse`: permite archivos más grandes que la memoria, pero el
    máximo es 10 MB y la API síncrona lo resuelve en menos de 1 s (§7). Más código sin
    necesidad.

## 2. Opciones de `csv-parse` y por qué cada una

```ts
{
  from_line: 2,              // la línea 1 es el encabezado, ya validado por CsvHeader
  skip_empty_lines: true,    // FR-005: líneas vacías no son filas
  trim: true,                // FR-011 y FR-005: saca espacios alrededor de cada valor;
                             // con skip_empty_lines, una línea de solo espacios se ignora
  relax_column_count: true,  // FR-008: una fila con 3 o 5 columnas no corta el archivo,
                             // se informa como error de esa fila
  relax_quotes: true,        // una comilla suelta en un valor sin comillas (Sala "A) es texto
  on_record: ...,            // §4: junta cada fila con su número de línea
}
```

Probado: `trim: true` también acepta espacios antes de una comilla de apertura
(`  "Oficina, piso 2" , 1 ,...`), que sin `trim` es un error de formato. `,,,` no se ignora:
es una fila de 4 valores vacíos (va a fallar por categoría vacía), como pide el spec.

## 3. Saltos de línea de Windows: normalizar antes de parsear

- **Decision**: reemplazar `\r\n` por `\n` en el texto antes de dárselo a `csv-parse`.
- **Rationale**: probado con el mismo contenido en `\n` y en `\r\n`. Con `\r\n` **dentro de un
  valor entre comillas** (una fila de varias líneas), `csv-parse` cuenta cada uno de esos saltos
  como dos líneas y **los números de línea se corren** desde esa fila: una fila que empieza en
  la línea 3 y ocupa tres líneas se informaba en la 7. Normalizado, los dos casos dan
  exactamente el mismo resultado (SC-004) y las líneas coinciden con el archivo (SC-002).
- **Corrección durante la implementación:** al principio se anotó que el corrimiento lo
  causaban las líneas en blanco. El test de US3 mostró que con `\r\n` y líneas en blanco, sin
  valores de varias líneas, las líneas salen bien: en la prueba original estaban las dos cosas
  juntas y se atribuyó mal la causa. La decisión no cambia.
- **Alternatives considered**: `record_delimiter: ["\r\n", "\n"]` en las opciones. Funciona en
  teoría, pero normalizar es una línea que se entiende sin conocer la biblioteca, y además deja
  igual los saltos dentro de valores entre comillas.

## 4. Número de línea de cada fila (FR-012)

- **Decision**: juntar las filas con el callback `on_record(fields, context)`. `context.lines`
  es la línea donde **termina** la fila; la línea donde **empieza** es
  `context.lines - (saltos de línea dentro de los valores)`.
- **Rationale**:
  - Probado con una fila de tres líneas (`"x⏎y⏎z",2,kWh,...` en las líneas 5 a 7): empieza en 5
    y termina en 7, con `\n` y con `\r\n` (normalizado). Las líneas vacías previas cuentan bien.
  - Cada salto de línea dentro de un valor entre comillas es exactamente una línea más del
    archivo, porque `trim` solo toca los espacios de afuera de las comillas.
  - `on_record` viene tipado (`InfoRecord`), así que no hace falta ningún `as` ni `any`.
- **Alternatives considered**:
  - Opción `info: true` y leer el valor que devuelve `parse`: el tipo declarado de la versión
    síncrona sigue siendo `string[][]`, habría que forzar el tipo con `as`.
  - Opción `raw: true` para contar líneas del texto crudo: probado, **el tipo miente**: con
    `raw` el callback recibe `{ record, raw }` aunque el tipo diga `string[]`. Descartado.

## 5. Comillas mal cerradas (FR-007)

- **Decision**: si `parse` lanza un `CsvError`, se devuelve un error de archivo:
  `El archivo tiene comillas mal cerradas después de la línea N`, donde N es la línea donde
  terminó la última fila leída bien (o 1, el encabezado, si no hubo ninguna). Cualquier otro
  error se relanza: no es esperable.
- **Rationale**:
  - Probado: una comilla que no se cierra da `CSV_QUOTE_NOT_CLOSED` y **la biblioteca informa
    la última línea del archivo**, no la de la comilla: la comilla abierta se come todo lo que
    sigue. La última fila leída bien sí se conoce (§4), y la comilla está después.
  - Texto después de la comilla de cierre (`"abc"x`) da
    `CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE`. El mismo mensaje sirve.
  - Con `relax_quotes`, una comilla en medio de un valor sin comillas ya no es error (probado:
    `ab"c` queda como texto `ab"c`).
- **Alternatives considered**: tratar las comillas rotas como error de fila y seguir.
  Imposible de forma confiable: después de una comilla abierta, la biblioteca no sabe dónde
  termina la fila.

## 6. Codificación UTF-8 (FR-002)

- **Decision**: decodificar con `new TextDecoder("utf-8", { fatal: true })`. Si lanza
  `TypeError`, error de archivo: `El archivo no es texto UTF-8 válido: guardalo como CSV
  UTF-8`.
- **Rationale**: probado con bytes en Latin-1 (`c\xe9,`): lanza `TypeError` con código
  `ERR_ENCODING_INVALID_ENCODED_DATA`. Sin `fatal`, el decodificador reemplaza los bytes malos
  por `�` y la fila pasaría con la categoría rota. `TextDecoder` también descarta el BOM
  (probado), igual que hace `CsvHeader`. Es parte de Node: no suma dependencias.
- **Alternatives considered**: detectar la codificación (por ejemplo, con `chardet`) y
  convertir. Es una dependencia más y una suposición: el spec pide rechazar con un mensaje
  claro.

## 7. Rendimiento con 10 MB (FR-017, SC-003)

- **Decision**: todo en memoria y síncrono.
- **Rationale**: probado: un CSV de 10 MB (234.687 filas) se decodifica y parsea en **967 ms**.
  Validar cada fila con `ActivityData.create` es trabajo lineal y barato. Queda muy por debajo
  de los 10 s del criterio. El parseo bloquea el proceso mientras dura, pero corre en el worker
  (spec 005), que procesa un archivo por vez; la API no lo usa.
- **Alternatives considered**: streams (§1). Sin necesidad con este tamaño.

## 8. Formato de la cantidad (FR-009)

- **Decision**: la cantidad tiene que cumplir `/^\d+(\.\d+)?$/` y recién ahí se convierte con
  `Number()`. Si no cumple, error de fila: `La cantidad "12,5" no es un número válido: usá
  solo dígitos y punto decimal (por ejemplo, 12.5)`. Que sea mayor que cero lo valida
  `ActivityData` (FR-010).
- **Rationale**: `Number()` solo es demasiado permisivo: `Number("")` es `0`, `Number("1e3")`
  es `1000`, `Number("0x10")` es `16` y `Number(" 12 ")` es `12`. La expresión regular dice
  exactamente qué se acepta y se lee en una línea. Vive en el parser y no en el dominio porque
  es una regla del **formato de texto** del CSV: `ActivityData` recibe un número.
- **Alternatives considered**: `parseFloat` (acepta `12abc` como 12) y una biblioteca de números
  con configuración regional. Descartadas.

## 9. Orden de las validaciones de archivo

1. UTF-8 (§6). Si el archivo no es texto, no tiene sentido leer el encabezado.
2. Encabezado con `CsvHeader.fromContent` (spec 003, FR-003). Mismo mensaje que la subida.
3. Parseo (§2 a §5). Comillas mal cerradas es error de archivo.
4. Si no quedó ninguna fila: `El archivo no tiene filas de datos: solo trae el encabezado`
   (FR-006).

Después, cada fila en este orden: cantidad de columnas (FR-008), formato de la cantidad (§8) y
`ActivityData.create` (FR-010). Una fila informa un solo motivo, el primero que falla.

## 10. Dónde vive y cómo se usa

- **Decision**: `application/services/CsvParserService.ts`, como dice el árbol de la consigna,
  detrás de la interfaz `ICsvParserService` en la misma carpeta. Se registra en Awilix como
  `csvParserService`. El handler del spec 005 dependerá de la interfaz.
- **Rationale**: la constitución (principio I) pide que los handlers dependan de interfaces. Es
  un servicio de aplicación y no de dominio porque depende de una biblioteca externa
  (`csv-parse`), y el dominio no importa librerías.
- **Alternatives considered**:
  - Interfaz en `domain`: el dominio no conoce el formato CSV más allá del encabezado.
  - Función suelta sin clase: no se puede inyectar ni reemplazar por un doble en el test del
    handler del 005.

## 11. Forma del resultado

- **Decision**: `parse(content, uploadId)` es síncrono y devuelve
  `Either<ValidationError, CsvParseResult>`, con
  `CsvParseResult = { validRows: ActivityData[]; rowErrors: RowError[]; totalRows: number }` y
  `RowError = { line: number; message: string }`.
- **Rationale**: `Either` para los errores esperables (FR-016), como el resto del proyecto. Las
  filas válidas ya son entidades `ActivityData` (FR-013): el 005 las guarda con
  `IActivityDataRepository.saveForUpload` sin convertir nada. `totalRows` se guarda aparte para
  que el 005 lo pase a `Upload.markAsCompleted` (que ya exige procesadas + fallidas = totales).
  Síncrono porque no hay entrada/salida: el contenido ya está en memoria.
- **Alternatives considered**: lanzar excepciones para los errores de archivo. El proyecto usa
  `Either` para lo esperable.
