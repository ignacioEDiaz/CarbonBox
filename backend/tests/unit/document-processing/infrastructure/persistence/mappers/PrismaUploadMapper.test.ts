import { Upload } from "../../../../../../src/document-processing/domain/entities/Upload";
import { FileName } from "../../../../../../src/document-processing/domain/value-objects/FileName";
import { UploadStatus } from "../../../../../../src/document-processing/domain/value-objects/UploadStatus";
import { PrismaUploadMapper } from "../../../../../../src/document-processing/infrastructure/persistence/mappers/PrismaUploadMapper";
import { Upload as UploadRecord } from "../../../../../../src/generated/prisma/client";

const record: UploadRecord = {
  id: "0b6f4c2e-1111-4a3b-9c5d-222233334444",
  fileName: "datos.csv",
  fileUrl: "uploads/datos.csv",
  status: "COMPLETED",
  userId: "user-123",
  totalRows: 10,
  processedRows: 8,
  failedRows: 2,
  errorMessage: null,
  idempotencyKey: null,
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
  updatedAt: new Date("2026-01-01T10:05:00.000Z"),
};

describe("PrismaUploadMapper", () => {
  it("toDomain reconstruye el upload con sus value objects", () => {
    const upload = PrismaUploadMapper.toDomain(record);

    expect(upload).toBeInstanceOf(Upload);
    expect(upload.id).toBe(record.id);
    expect(upload.fileName).toBeInstanceOf(FileName);
    expect(upload.fileName.value).toBe("datos.csv");
    expect(upload.status.equals(UploadStatus.COMPLETED)).toBe(true);
    expect([upload.totalRows, upload.processedRows, upload.failedRows]).toEqual([10, 8, 2]);
  });

  it("toPersistence(toDomain(registro)) devuelve el mismo registro", () => {
    expect(PrismaUploadMapper.toPersistence(PrismaUploadMapper.toDomain(record))).toEqual(record);
  });

  it("la ida y vuelta conserva la clave de idempotencia", () => {
    const withKey = { ...record, idempotencyKey: "abc-123" };

    expect(PrismaUploadMapper.toPersistence(PrismaUploadMapper.toDomain(withKey))).toEqual(withKey);
  });

  it("un upload reconstruido conserva sus reglas: COMPLETED no vuelve a PROCESSING", () => {
    const upload = PrismaUploadMapper.toDomain(record);

    expect(upload.markAsProcessing().isLeft()).toBe(true);
  });
});
