import { asClass, AwilixContainer } from "awilix";
import { PrismaActivityDataRepository } from "../persistence/repositories/PrismaActivityDataRepository";
import { PrismaUploadRepository } from "../persistence/repositories/PrismaUploadRepository";

// Registra las piezas del bounded context document-processing.
// Los nombres son los que los handlers usan como parámetros del constructor.
export function registerDocumentProcessingModule(container: AwilixContainer): void {
  container.register({
    uploadRepository: asClass(PrismaUploadRepository).singleton(),
    activityDataRepository: asClass(PrismaActivityDataRepository).singleton(),
  });
}
