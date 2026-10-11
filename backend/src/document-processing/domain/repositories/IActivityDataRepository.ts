import { ActivityData } from "../entities/ActivityData";

export interface IActivityDataRepository {
  // Reemplaza todas las filas del upload (todo o nada): guardar dos veces no duplica
  saveForUpload(uploadId: string, rows: ActivityData[]): Promise<void>;
  findByUploadId(uploadId: string): Promise<ActivityData[]>;
}
