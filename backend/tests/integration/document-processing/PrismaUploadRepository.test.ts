import { randomUUID } from "node:crypto";
import { Upload } from "../../../src/document-processing/domain/entities/Upload";
import { FileName } from "../../../src/document-processing/domain/value-objects/FileName";
import { IdempotencyKey } from "../../../src/document-processing/domain/value-objects/IdempotencyKey";
import { UploadStatus } from "../../../src/document-processing/domain/value-objects/UploadStatus";
import { PrismaUploadRepository } from "../../../src/document-processing/infrastructure/persistence/repositories/PrismaUploadRepository";
import { DuplicateIdempotencyKeyError } from "../../../src/shared/domain/errors";
import { createTestPrismaClient } from "../testPrismaClient";

const prisma = createTestPrismaClient();
const repository = new PrismaUploadRepository(prisma);

afterAll(async () => {
  await prisma.$disconnect();
});

// Cada test crea su propio upload (id aleatorio): no hace falta limpiar tablas
function newUpload(): Upload {
  const fileName = FileName.create("datos.csv");
  if (fileName.isLeft()) throw fileName.value;
  const upload = Upload.create({ fileName: fileName.value, fileUrl: "uploads/datos.csv", userId: "user-123" });
  if (upload.isLeft()) throw upload.value;
  return upload.value;
}

async function saveAndReload(upload: Upload): Promise<Upload> {
  await repository.save(upload);
  const reloaded = await repository.findById(upload.id);
  if (reloaded === null) throw new Error("el upload guardado no se encontró");
  return reloaded;
}

describe("PrismaUploadRepository", () => {
  it("guarda un upload nuevo y lo lee con los mismos valores", async () => {
    const upload = newUpload();

    const reloaded = await saveAndReload(upload);

    expect(reloaded.id).toBe(upload.id);
    expect(reloaded.fileName.value).toBe("datos.csv");
    expect(reloaded.fileUrl).toBe("uploads/datos.csv");
    expect(reloaded.status.equals(UploadStatus.PENDING)).toBe(true);
    expect(reloaded.userId).toBe("user-123");
    expect(reloaded.totalRows).toBeNull();
    expect(reloaded.errorMessage).toBeNull();
    expect(reloaded.createdAt).toEqual(upload.createdAt);
    expect(reloaded.updatedAt).toEqual(upload.updatedAt);
  });

  it("actualiza el estado de un upload ya guardado", async () => {
    const upload = newUpload();
    await repository.save(upload);
    await new Promise((resolve) => setTimeout(resolve, 5)); // que updatedAt sea posterior
    upload.markAsProcessing();

    const reloaded = await saveAndReload(upload);

    expect(reloaded.status.equals(UploadStatus.PROCESSING)).toBe(true);
    expect(reloaded.updatedAt.getTime()).toBeGreaterThan(reloaded.createdAt.getTime());
  });

  it("guarda los conteos de un upload completado", async () => {
    const upload = newUpload();
    upload.markAsProcessing();
    upload.markAsCompleted({ totalRows: 10, processedRows: 8, failedRows: 2 });

    const reloaded = await saveAndReload(upload);

    expect(reloaded.status.equals(UploadStatus.COMPLETED)).toBe(true);
    expect([reloaded.totalRows, reloaded.processedRows, reloaded.failedRows]).toEqual([10, 8, 2]);
  });

  it("guarda el mensaje de un upload fallido", async () => {
    const upload = newUpload();
    upload.markAsProcessing();
    upload.markAsFailed("archivo ilegible");

    const reloaded = await saveAndReload(upload);

    expect(reloaded.status.equals(UploadStatus.FAILED)).toBe(true);
    expect(reloaded.errorMessage).toBe("archivo ilegible");
  });

  it.each([randomUUID(), "abc"])("findById devuelve null si %p no existe", async (id) => {
    await expect(repository.findById(id)).resolves.toBeNull();
  });

  it("un upload leído de la base sigue aplicando sus reglas", async () => {
    const upload = newUpload();
    upload.markAsProcessing();
    upload.markAsCompleted({ totalRows: 1, processedRows: 1, failedRows: 0 });

    const reloaded = await saveAndReload(upload);

    expect(reloaded.markAsProcessing().isLeft()).toBe(true);
  });
});

describe("PrismaUploadRepository: clave de idempotencia", () => {
  function uploadWithKey(rawKey: string): Upload {
    const fileName = FileName.create("datos.csv");
    const idempotencyKey = IdempotencyKey.create(rawKey);
    if (fileName.isLeft()) throw fileName.value;
    if (idempotencyKey.isLeft()) throw idempotencyKey.value;
    const upload = Upload.create({
      fileName: fileName.value,
      fileUrl: "uploads/datos.csv",
      userId: "user-123",
      idempotencyKey: idempotencyKey.value,
    });
    if (upload.isLeft()) throw upload.value;
    return upload.value;
  }

  it("findByIdempotencyKey encuentra el upload guardado con esa clave", async () => {
    const key = randomUUID();
    const upload = uploadWithKey(key);
    await repository.save(upload);

    const found = await repository.findByIdempotencyKey(key);

    expect(found?.id).toBe(upload.id);
    expect(found?.idempotencyKey).toBe(key);
  });

  it("findByIdempotencyKey devuelve null si nadie usó la clave", async () => {
    await expect(repository.findByIdempotencyKey(randomUUID())).resolves.toBeNull();
  });

  it("guardar otro upload con una clave ya usada lanza DuplicateIdempotencyKeyError", async () => {
    const key = randomUUID();
    await repository.save(uploadWithKey(key));

    await expect(repository.save(uploadWithKey(key))).rejects.toBeInstanceOf(DuplicateIdempotencyKeyError);
  });

  it("volver a guardar el mismo upload (cambio de estado) no choca con su propia clave", async () => {
    const upload = uploadWithKey(randomUUID());
    await repository.save(upload);
    upload.markAsProcessing();

    await expect(repository.save(upload)).resolves.toBeUndefined();
  });
});

describe("PrismaUploadRepository.findPageByUserId", () => {
  // Un usuario propio por test: la base de tests no se limpia y los conteos tienen que ser exactos
  async function saveUploadsFor(userId: string, count: number): Promise<Upload[]> {
    const saved: Upload[] = [];
    for (let index = 0; index < count; index++) {
      const fileName = FileName.create(`datos-${index}.csv`);
      if (fileName.isLeft()) throw fileName.value;
      const upload = Upload.create({ fileName: fileName.value, fileUrl: `uploads/${index}.csv`, userId });
      if (upload.isLeft()) throw upload.value;
      await repository.save(upload.value);
      saved.push(upload.value);
      await new Promise((resolve) => setTimeout(resolve, 2)); // createdAt distintos
    }
    return saved;
  }

  it("devuelve una página del más nuevo al más viejo y el total", async () => {
    const userId = `user-${randomUUID()}`;
    const saved = await saveUploadsFor(userId, 5);

    const firstPage = await repository.findPageByUserId(userId, { skip: 0, take: 2 });
    const lastPage = await repository.findPageByUserId(userId, { skip: 4, take: 2 });

    expect(firstPage.total).toBe(5);
    expect(firstPage.uploads.map((upload) => upload.id)).toEqual([saved[4].id, saved[3].id]);
    expect(lastPage.uploads.map((upload) => upload.id)).toEqual([saved[0].id]);
  });

  it("no incluye uploads de otros usuarios", async () => {
    const userId = `user-${randomUUID()}`;
    await saveUploadsFor(`user-${randomUUID()}`, 2);

    expect(await repository.findPageByUserId(userId, { skip: 0, take: 10 })).toEqual({ uploads: [], total: 0 });
  });
});
