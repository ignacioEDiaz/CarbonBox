import { asClass, AwilixContainer } from "awilix";
import { PrismaUploadRepository } from "../persistence/repositories/PrismaUploadRepository";

// Registra las piezas del bounded context document-processing.
// Los nombres son los que los handlers usan como parámetros del constructor.
export function registerDocumentProcessingModule(container: AwilixContainer): void {
  container.register({
    uploadRepository: asClass(PrismaUploadRepository).singleton(),
  });
}
