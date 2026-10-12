import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { Upload } from "../../domain/entities/Upload";

// Los conteos que van a Upload.markAsCompleted
export type ProcessingSummary = {
  totalRows: number;
  processedRows: number;
  failedRows: number;
};

// El trabajo pesado del procesamiento: leer, parsear y guardar. Left si el archivo entero es
// inválido (error de negocio); lanza si falla el storage o la base (error transitorio).
export interface IFileProcessingService {
  process(upload: Upload): Promise<Either<ValidationError, ProcessingSummary>>;
}
