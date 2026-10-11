import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { ActivityData } from "../../domain/entities/ActivityData";

// Un problema de una fila: información para quien subió el archivo, no un error del sistema
export type RowError = {
  line: number; // línea del archivo donde empieza la fila (el encabezado es la 1)
  message: string;
};

// Lo que devuelve el parser cuando el archivo se pudo leer: siempre validRows + rowErrors = totalRows
export type CsvParseResult = {
  validRows: ActivityData[];
  rowErrors: RowError[];
  totalRows: number;
};

// Left si el archivo entero no se puede procesar (codificación, encabezado, comillas, sin filas)
export interface ICsvParserService {
  parse(content: Uint8Array, uploadId: string): Either<ValidationError, CsvParseResult>;
}
