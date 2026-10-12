import { ActivityData } from "../../src/document-processing/domain/entities/ActivityData";
import { IActivityDataRepository } from "../../src/document-processing/domain/repositories/IActivityDataRepository";

// Doble de IActivityDataRepository: guardar reemplaza las filas del upload, como la base
export class InMemoryActivityDataRepository implements IActivityDataRepository {
  readonly rowsByUpload = new Map<string, ActivityData[]>();

  async saveForUpload(uploadId: string, rows: ActivityData[]): Promise<void> {
    this.rowsByUpload.set(uploadId, [...rows]);
  }

  async findByUploadId(uploadId: string): Promise<ActivityData[]> {
    return this.rowsByUpload.get(uploadId) ?? [];
  }
}
