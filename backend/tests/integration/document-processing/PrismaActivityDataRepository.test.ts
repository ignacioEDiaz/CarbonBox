import { randomUUID } from "node:crypto";
import { ActivityData } from "../../../src/document-processing/domain/entities/ActivityData";
import { Upload } from "../../../src/document-processing/domain/entities/Upload";
import { FileName } from "../../../src/document-processing/domain/value-objects/FileName";
import { PrismaActivityDataRepository } from "../../../src/document-processing/infrastructure/persistence/repositories/PrismaActivityDataRepository";
import { PrismaUploadRepository } from "../../../src/document-processing/infrastructure/persistence/repositories/PrismaUploadRepository";
import { createTestPrismaClient } from "../testPrismaClient";

const prisma = createTestPrismaClient();
const uploadRepository = new PrismaUploadRepository(prisma);
const repository = new PrismaActivityDataRepository(prisma);

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

function rows(uploadId: string, count: number, category = "Electricity"): ActivityData[] {
  return Array.from({ length: count }, (_, index) => {
    const result = ActivityData.create({ uploadId, category, amount: 150.5 + index, unit: "kWh", date: "2024-01-15" });
    if (result.isLeft()) throw result.value;
    return result.value;
  });
}

describe("PrismaActivityDataRepository", () => {
  it("guarda filas de un upload y las lee con los mismos valores", async () => {
    const uploadId = await savedUploadId();
    const saved = rows(uploadId, 5);

    await repository.saveForUpload(uploadId, saved);
    const read = await repository.findByUploadId(uploadId);

    expect(read).toHaveLength(5);
    const first = read.find((activity) => activity.id === saved[0].id);
    expect(first?.category).toBe("Electricity");
    expect(first?.amount).toBe(150.5);
    expect(first?.unit).toBe("kWh");
    expect(first?.date).toBe("2024-01-15"); // el mismo día, sin corrimiento por zona horaria
  });

  it("un upload sin filas devuelve una lista vacía", async () => {
    const uploadId = await savedUploadId();

    await expect(repository.findByUploadId(uploadId)).resolves.toEqual([]);
  });

  it("rechaza filas de un upload inexistente y no guarda ninguna", async () => {
    const missingUploadId = randomUUID();

    await expect(repository.saveForUpload(missingUploadId, rows(missingUploadId, 3))).rejects.toThrow();
    await expect(repository.findByUploadId(missingUploadId)).resolves.toEqual([]);
  });

  it("no mezcla las filas de distintos uploads", async () => {
    const firstUploadId = await savedUploadId();
    const secondUploadId = await savedUploadId();
    await repository.saveForUpload(firstUploadId, rows(firstUploadId, 2, "Water"));
    await repository.saveForUpload(secondUploadId, rows(secondUploadId, 3, "Gas"));

    const read = await repository.findByUploadId(firstUploadId);

    expect(read).toHaveLength(2);
    expect(read.every((activity) => activity.category === "Water")).toBe(true);
  });

  it("guardar de nuevo reemplaza las filas anteriores (reintento idempotente)", async () => {
    const uploadId = await savedUploadId();
    await repository.saveForUpload(uploadId, rows(uploadId, 5));
    const retry = rows(uploadId, 3);

    await repository.saveForUpload(uploadId, retry);
    const read = await repository.findByUploadId(uploadId);

    expect(read.map((activity) => activity.id).sort()).toEqual(retry.map((activity) => activity.id).sort());
  });

  it("guarda 1.000 filas en menos de 2 s y las lee en menos de 1 s", async () => {
    const uploadId = await savedUploadId();
    const many = rows(uploadId, 1000);

    const saveStart = Date.now();
    await repository.saveForUpload(uploadId, many);
    const saveMs = Date.now() - saveStart;
    const readStart = Date.now();
    const read = await repository.findByUploadId(uploadId);
    const readMs = Date.now() - readStart;

    expect(read).toHaveLength(1000);
    expect(saveMs).toBeLessThan(2000);
    expect(readMs).toBeLessThan(1000);
  });
});
