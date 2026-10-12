import { asClass, AwilixContainer } from "awilix";
import { CreateUploadCommandHandler } from "../../application/commands/handlers/CreateUploadCommandHandler";
import { ProcessFileCommandHandler } from "../../application/commands/handlers/ProcessFileCommandHandler";
import { GetUploadByIdQueryHandler } from "../../application/queries/handlers/GetUploadByIdQueryHandler";
import { GetUploadRowErrorsQueryHandler } from "../../application/queries/handlers/GetUploadRowErrorsQueryHandler";
import { CsvParserService } from "../../application/services/CsvParserService";
import { FileProcessingService } from "../../application/services/FileProcessingService";
import { FileProcessingWorker } from "../../../workers/FileProcessingWorker";
import { CreateUploadController } from "../../presentation/controllers/CreateUploadController";
import { GetUploadByIdController } from "../../presentation/controllers/GetUploadByIdController";
import { GetUploadRowErrorsController } from "../../presentation/controllers/GetUploadRowErrorsController";
import { SqsMessageConsumer } from "../messaging/SqsMessageConsumer";
import { SqsMessagePublisher } from "../messaging/SqsMessagePublisher";
import { PrismaActivityDataRepository } from "../persistence/repositories/PrismaActivityDataRepository";
import { PrismaRowErrorRepository } from "../persistence/repositories/PrismaRowErrorRepository";
import { PrismaUploadRepository } from "../persistence/repositories/PrismaUploadRepository";
import { S3FileStorage } from "../storage/S3FileStorage";

// Registra las piezas del bounded context document-processing.
// Los nombres son los que los handlers usan como parámetros del constructor.
// Es el único lugar que conoce las clases concretas: los handlers solo ven las interfaces.
export function registerDocumentProcessingModule(container: AwilixContainer): void {
  container.register({
    uploadRepository: asClass(PrismaUploadRepository).singleton(),
    activityDataRepository: asClass(PrismaActivityDataRepository).singleton(),
    fileStorage: asClass(S3FileStorage).singleton(),
    messagePublisher: asClass(SqsMessagePublisher).singleton(),
    messageConsumer: asClass(SqsMessageConsumer).singleton(), // lo usa el worker (spec 005)
    rowErrorRepository: asClass(PrismaRowErrorRepository).singleton(),
    csvParserService: asClass(CsvParserService).singleton(),
    fileProcessingService: asClass(FileProcessingService).singleton(),
    processFileCommandHandler: asClass(ProcessFileCommandHandler).singleton(),
    fileProcessingWorker: asClass(FileProcessingWorker).singleton(), // lo arranca npm run worker

    createUploadCommandHandler: asClass(CreateUploadCommandHandler).singleton(),
    createUploadController: asClass(CreateUploadController).singleton(),
    getUploadByIdQueryHandler: asClass(GetUploadByIdQueryHandler).singleton(),
    getUploadByIdController: asClass(GetUploadByIdController).singleton(),
    getUploadRowErrorsQueryHandler: asClass(GetUploadRowErrorsQueryHandler).singleton(),
    getUploadRowErrorsController: asClass(GetUploadRowErrorsController).singleton(),
  });
}
