import { PrismaActivityDataRepository } from "../../../src/document-processing/infrastructure/persistence/repositories/PrismaActivityDataRepository";
import { PrismaUploadRepository } from "../../../src/document-processing/infrastructure/persistence/repositories/PrismaUploadRepository";
import { buildContainer } from "../../../src/main/container";
import { testConfig } from "../../support/testConfig";

// No necesita base ni LocalStack: Prisma y el SDK de AWS se conectan recién en la primera llamada
const container = buildContainer(testConfig());

afterAll(async () => {
  await container.dispose();
});

describe("contenedor de dependencias", () => {
  it("resuelve uploadRepository con la implementación de Prisma", () => {
    expect(container.resolve("uploadRepository")).toBeInstanceOf(PrismaUploadRepository);
  });

  it("resuelve activityDataRepository con la implementación de Prisma", () => {
    expect(container.resolve("activityDataRepository")).toBeInstanceOf(PrismaActivityDataRepository);
  });
});
