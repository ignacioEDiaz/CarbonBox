import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { CreateUploadCommandHandler } from "../../../src/document-processing/application/commands/handlers/CreateUploadCommandHandler";
import { CsvParserService } from "../../../src/document-processing/application/services/CsvParserService";
import { SqsMessageConsumer } from "../../../src/document-processing/infrastructure/messaging/SqsMessageConsumer";
import { SqsMessagePublisher } from "../../../src/document-processing/infrastructure/messaging/SqsMessagePublisher";
import { S3FileStorage } from "../../../src/document-processing/infrastructure/storage/S3FileStorage";
import { CreateUploadController } from "../../../src/document-processing/presentation/controllers/CreateUploadController";
import { PrismaActivityDataRepository } from "../../../src/document-processing/infrastructure/persistence/repositories/PrismaActivityDataRepository";
import { PrismaUploadRepository } from "../../../src/document-processing/infrastructure/persistence/repositories/PrismaUploadRepository";
import { ProcessFileCommandHandler } from "../../../src/document-processing/application/commands/handlers/ProcessFileCommandHandler";
import { FileProcessingService } from "../../../src/document-processing/application/services/FileProcessingService";
import { PrismaRowErrorRepository } from "../../../src/document-processing/infrastructure/persistence/repositories/PrismaRowErrorRepository";
import { GetUploadResultsController } from "../../../src/document-processing/presentation/controllers/GetUploadResultsController";
import { ListUploadsController } from "../../../src/document-processing/presentation/controllers/ListUploadsController";
import { buildContainer } from "../../../src/main/container";
import { FileProcessingWorker } from "../../../src/workers/FileProcessingWorker";
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

  it("resuelve fileStorage con S3, y messagePublisher y messageConsumer con SQS", () => {
    expect(container.resolve("fileStorage")).toBeInstanceOf(S3FileStorage);
    expect(container.resolve("messagePublisher")).toBeInstanceOf(SqsMessagePublisher);
    expect(container.resolve("messageConsumer")).toBeInstanceOf(SqsMessageConsumer);
  });

  it("resuelve el handler y el controller de la subida", () => {
    expect(container.resolve("createUploadCommandHandler")).toBeInstanceOf(CreateUploadCommandHandler);
    expect(container.resolve("createUploadController")).toBeInstanceOf(CreateUploadController);
  });

  it("resuelve csvParserService con el parser de csv-parse", () => {
    expect(container.resolve("csvParserService")).toBeInstanceOf(CsvParserService);
  });

  it("resuelve las piezas del procesamiento (spec 005)", () => {
    expect(container.resolve("rowErrorRepository")).toBeInstanceOf(PrismaRowErrorRepository);
    expect(container.resolve("fileProcessingService")).toBeInstanceOf(FileProcessingService);
    expect(container.resolve("processFileCommandHandler")).toBeInstanceOf(ProcessFileCommandHandler);
    expect(container.resolve("fileProcessingWorker")).toBeInstanceOf(FileProcessingWorker);
  });

  it("resuelve los controllers de las consultas (spec 006)", () => {
    expect(container.resolve("listUploadsController")).toBeInstanceOf(ListUploadsController);
    expect(container.resolve("getUploadResultsController")).toBeInstanceOf(GetUploadResultsController);
  });

  it("resuelve los clientes del SDK de AWS", () => {
    expect(container.resolve("sqsClient")).toBeInstanceOf(SQSClient);
    expect(container.resolve("s3Client")).toBeInstanceOf(S3Client);
  });
});
