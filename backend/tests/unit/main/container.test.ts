import { PrismaUploadRepository } from "../../../src/document-processing/infrastructure/persistence/repositories/PrismaUploadRepository";
import { buildContainer } from "../../../src/main/container";

// No necesita base: Prisma se conecta recién en la primera consulta
const container = buildContainer({ port: 0, database: { url: "postgresql://u:p@localhost:1/db" } });

afterAll(async () => {
  await container.dispose();
});

describe("contenedor de dependencias", () => {
  it("resuelve uploadRepository con la implementación de Prisma", () => {
    expect(container.resolve("uploadRepository")).toBeInstanceOf(PrismaUploadRepository);
  });
});
