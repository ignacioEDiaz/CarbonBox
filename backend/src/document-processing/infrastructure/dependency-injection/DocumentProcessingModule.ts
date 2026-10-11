import { asClass, AwilixContainer } from "awilix";
import { CreateUploadCommandHandler } from "../../application/commands/handlers/CreateUploadCommandHandler";
import { GetUploadByIdQueryHandler } from "../../application/queries/handlers/GetUploadByIdQueryHandler";
import { CreateUploadController } from "../../presentation/controllers/CreateUploadController";
import { GetUploadByIdController } from "../../presentation/controllers/GetUploadByIdController";
import { SqsMessagePublisher } from "../messaging/SqsMessagePublisher";
import { PrismaActivityDataRepository } from "../persistence/repositories/PrismaActivityDataRepository";
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

    createUploadCommandHandler: asClass(CreateUploadCommandHandler).singleton(),
    createUploadController: asClass(CreateUploadController).singleton(),
    getUploadByIdQueryHandler: asClass(GetUploadByIdQueryHandler).singleton(),
    getUploadByIdController: asClass(GetUploadByIdController).singleton(),
  });
}
