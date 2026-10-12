import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { ActivityData } from "../../domain/entities/ActivityData";
import { RowError } from "../../domain/value-objects/RowError";

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
