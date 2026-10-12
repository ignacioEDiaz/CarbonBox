import { Upload } from "../../../src/document-processing/domain/entities/Upload";
import { FileName } from "../../../src/document-processing/domain/value-objects/FileName";
import { PrismaRowErrorRepository } from "../../../src/document-processing/infrastructure/persistence/repositories/PrismaRowErrorRepository";
import { PrismaUploadRepository } from "../../../src/document-processing/infrastructure/persistence/repositories/PrismaUploadRepository";
import { createTestPrismaClient } from "../testPrismaClient";

const prisma = createTestPrismaClient();
const uploadRepository = new PrismaUploadRepository(prisma);
const repository = new PrismaRowErrorRepository(prisma);

afterAll(async () => {
  await prisma.$disconnect();
});

async function savedUploadId(): Promise<string> {
  const fileName = FileName.create("datos.csv");
  if (fileName.isLeft()) throw fileName.value;
  const upload = Upload.create({ fileName: fileName.value, fileUrl: "uploads/datos.csv", userId: "user-123" });
  if (upload.isLeft()) throw upload.value;
  await uploadRepository.save(upload.value);
  return upload.value.id;
}

describe("PrismaRowErrorRepository", () => {
  it("guarda los errores de un upload y los lee ordenados por línea", async () => {
    const uploadId = await savedUploadId();

    await repository.saveForUpload(uploadId, [
      { line: 7, message: "La unidad no puede estar vacía" },
      { line: 3, message: "La categoría no puede estar vacía" },
    ]);

    expect(await repository.findByUploadId(uploadId)).toEqual([
      { line: 3, message: "La categoría no puede estar vacía" },
      { line: 7, message: "La unidad no puede estar vacía" },
    ]);
  });

  it("guardar de nuevo reemplaza los errores anteriores (reintento)", async () => {
    const uploadId = await savedUploadId();
    await repository.saveForUpload(uploadId, [{ line: 2, message: "viejo" }, { line: 4, message: "viejo" }]);

    await repository.saveForUpload(uploadId, [{ line: 5, message: "nuevo" }]);

    expect(await repository.findByUploadId(uploadId)).toEqual([{ line: 5, message: "nuevo" }]);
  });

  it("no mezcla los errores de distintos uploads, y un upload sin errores devuelve []", async () => {
    const first = await savedUploadId();
    const second = await savedUploadId();
    await repository.saveForUpload(first, [{ line: 2, message: "del primero" }]);

    expect(await repository.findByUploadId(second)).toEqual([]);
  });
});
