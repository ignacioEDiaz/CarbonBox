import { IRowErrorRepository } from "../../src/document-processing/domain/repositories/IRowErrorRepository";
import { RowError } from "../../src/document-processing/domain/value-objects/RowError";

// Doble de IRowErrorRepository: guardar reemplaza los errores del upload, como la base
export class InMemoryRowErrorRepository implements IRowErrorRepository {
  readonly errorsByUpload = new Map<string, RowError[]>();

  async saveForUpload(uploadId: string, errors: RowError[]): Promise<void> {
    this.errorsByUpload.set(uploadId, [...errors]);
  }

  async findByUploadId(uploadId: string): Promise<RowError[]> {
    return [...(this.errorsByUpload.get(uploadId) ?? [])].sort((a, b) => a.line - b.line);
  }
}
