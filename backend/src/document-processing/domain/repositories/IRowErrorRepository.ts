import { RowError } from "../value-objects/RowError";

// Los errores por fila de cada upload. La implementación vive en infrastructure.
export interface IRowErrorRepository {
  // Reemplaza todos los errores del upload (todo o nada): un reintento no los duplica
  saveForUpload(uploadId: string, errors: RowError[]): Promise<void>;
  // Ordenados por línea
  findByUploadId(uploadId: string): Promise<RowError[]>;
}
