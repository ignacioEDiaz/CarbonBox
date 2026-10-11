import { Upload } from "../../src/document-processing/domain/entities/Upload";
import { IUploadRepository } from "../../src/document-processing/domain/repositories/IUploadRepository";
import { CallLog } from "./CallLog";

// Doble de IUploadRepository. Guarda una copia, como una base: si alguien cambia el upload y
// no lo vuelve a guardar, el cambio no aparece acá.
export class InMemoryUploadRepository implements IUploadRepository {
  private readonly uploads = new Map<string, Upload>();

  constructor(private readonly log = new CallLog()) {}

  get all(): Upload[] {
    return [...this.uploads.values()];
  }

  async save(upload: Upload): Promise<void> {
    this.log.record("repository.save");
    this.uploads.set(upload.id, copy(upload));
  }

  async findById(id: string): Promise<Upload | null> {
    const upload = this.uploads.get(id);
    return upload === undefined ? null : copy(upload);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Upload | null> {
    const upload = this.all.find((saved) => saved.idempotencyKey === idempotencyKey);
    return upload === undefined ? null : copy(upload);
  }
}

function copy(upload: Upload): Upload {
  return Upload.restore({
    id: upload.id,
    fileName: upload.fileName,
    fileUrl: upload.fileUrl,
    status: upload.status,
    userId: upload.userId,
    totalRows: upload.totalRows,
    processedRows: upload.processedRows,
    failedRows: upload.failedRows,
    errorMessage: upload.errorMessage,
    idempotencyKey: upload.idempotencyKey,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
  });
}
