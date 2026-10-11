import { Upload as UploadRecord } from "../../../../generated/prisma/client";
import { Upload } from "../../../domain/entities/Upload";
import { FileName } from "../../../domain/value-objects/FileName";
import { UploadStatus } from "../../../domain/value-objects/UploadStatus";

// Traduce entre la fila de Prisma y la entidad de dominio. Es el único lugar que conoce las dos.
export class PrismaUploadMapper {
  static toDomain(record: UploadRecord): Upload {
    const fileName = FileName.create(record.fileName);
    if (fileName.isLeft()) {
      // Solo pasaría si alguien guardó un nombre inválido por fuera de la aplicación
      throw new Error(`Upload ${record.id} con nombre inválido en la base: ${fileName.value.message}`);
    }
    return Upload.restore({ ...record, fileName: fileName.value, status: UploadStatus.from(record.status) });
  }

  static toPersistence(upload: Upload): UploadRecord {
    return {
      id: upload.id,
      fileName: upload.fileName.value,
      fileUrl: upload.fileUrl,
      status: upload.status.value,
      userId: upload.userId,
      totalRows: upload.totalRows,
      processedRows: upload.processedRows,
      failedRows: upload.failedRows,
      errorMessage: upload.errorMessage,
      createdAt: upload.createdAt,
      updatedAt: upload.updatedAt,
    };
  }
}
