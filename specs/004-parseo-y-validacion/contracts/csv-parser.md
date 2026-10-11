# Contrato: ICsvParserService

`backend/src/document-processing/application/services/ICsvParserService.ts`

Lo usa el handler de procesamiento del spec 005, que depende solo de esta interfaz. La
implementación es `CsvParserService` (misma carpeta), registrada en Awilix como
`csvParserService`.

```ts
import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { ActivityData } from "../../domain/entities/ActivityData";

export type RowError = {
  line: number;    // línea del archivo donde empieza la fila (el encabezado es la 1)
  message: string; // un solo motivo, en español
};

export type CsvParseResult = {
  validRows: ActivityData[];
  rowErrors: RowError[];
  totalRows: number; // validRows.length + rowErrors.length
};

export interface ICsvParserService {
  parse(content: Uint8Array, uploadId: string): Either<ValidationError, CsvParseResult>;
}
```

## Comportamiento

| Entrada | Resultado |
|---|---|
| Bytes que no son UTF-8 | `Left(ValidationError)` "no es texto UTF-8" |
| Primera línea distinta de `category,amount,unit,date` (con la tolerancia de `CsvHeader`) | `Left(ValidationError)` con el mensaje de `CsvHeader` |
| Comillas mal cerradas | `Left(ValidationError)` "comillas mal cerradas después de la línea N" |
| Solo el encabezado, o encabezado y líneas vacías | `Left(ValidationError)` "no tiene filas de datos" |
| Archivo con al menos una fila de datos | `Right(CsvParseResult)`, aunque todas las filas sean inválidas |

Garantías del `Right`:

- `totalRows === validRows.length + rowErrors.length` y `totalRows >= 1`.
- `validRows` y `rowErrors` están en el orden del archivo.
- Cada `ActivityData` de `validRows` tiene el `uploadId` recibido y valores recortados; la
  cantidad ya es número.
- Mismo `content` → mismos valores en `validRows`, mismos `rowErrors`, mismo `totalRows` (los
  `id` de `ActivityData` se generan nuevos cada vez).

No lanza por errores esperables (FR-016). Solo un error inesperado (un bug, una falla de la
biblioteca que no sea `CsvError`) sale como excepción, y lo maneja quien llama.

`parse` es síncrono: no hace entrada/salida. Bajar el archivo de S3 es trabajo de quien llama.
