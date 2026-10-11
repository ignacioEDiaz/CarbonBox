import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
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

  it("resuelve los clientes del SDK de AWS", () => {
    expect(container.resolve("sqsClient")).toBeInstanceOf(SQSClient);
    expect(container.resolve("s3Client")).toBeInstanceOf(S3Client);
  });
});
