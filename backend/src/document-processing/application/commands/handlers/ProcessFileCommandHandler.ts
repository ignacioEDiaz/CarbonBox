import { ICommandHandler } from "../../../../shared/application/ICommandHandler";
import { Either } from "../../../../shared/domain/Either";
import { NotFoundError, ValidationError } from "../../../../shared/domain/errors";
import { Upload } from "../../../domain/entities/Upload";
import { IUploadRepository } from "../../../domain/repositories/IUploadRepository";
import { UploadStatus, UploadStatusValue } from "../../../domain/value-objects/UploadStatus";
import { IFileProcessingService, ProcessingSummary } from "../../services/IFileProcessingService";
import { ProcessFileCommand } from "../objects/ProcessFileCommand";

export const MAX_PROCESSING_ATTEMPTS = 3;
export const FAILED_AFTER_RETRIES_MESSAGE = `No se pudo procesar después de ${MAX_PROCESSING_ATTEMPTS} intentos`;

// El ciclo de vida del upload durante el procesamiento. Devuelve el estado en que quedó.
// Un Left o un Right son definitivos (el worker borra el mensaje); una excepción es una falla
// transitoria (el mensaje queda en la cola y se reintenta).
export class ProcessFileCommandHandler implements ICommandHandler<ProcessFileCommand, UploadStatusValue> {
  constructor(
    private readonly uploadRepository: IUploadRepository,
    private readonly fileProcessingService: IFileProcessingService,
  ) {}

  async execute(command: ProcessFileCommand): Promise<Either<Error, UploadStatusValue>> {
    const upload = await this.uploadRepository.findById(command.uploadId);
    if (upload === null) {
      return Either.left(new NotFoundError(`No existe un upload con id ${command.uploadId}`));
    }
    // Ya terminado: es una entrega repetida del mismo mensaje, no se procesa de nuevo
    if (isFinished(upload)) {
      return Either.right(upload.status.value);
    }
    try {
      return await this.process(upload);
    } catch (error) {
      if (command.attempt < MAX_PROCESSING_ATTEMPTS) {
        throw error;
      }
      return this.markAsFailedAfterRetries(command.uploadId);
    }
  }

  private async process(upload: Upload): Promise<Either<Error, UploadStatusValue>> {
    const processingOrError = upload.markAsProcessing(); // PENDING o PROCESSING (reintento)
    if (processingOrError.isLeft()) {
      return Either.left(processingOrError.value);
    }
    await this.uploadRepository.save(upload);
    const summaryOrError = await this.fileProcessingService.process(upload);
    const finalStateOrError = applyResult(upload, summaryOrError);
    if (finalStateOrError.isLeft()) {
      return Either.left(finalStateOrError.value);
    }
    await this.uploadRepository.save(upload);
    return Either.right(upload.status.value);
  }

  // Se vuelve a leer el upload: el que estaba en memoria pudo quedar a medio cambiar
  private async markAsFailedAfterRetries(uploadId: string): Promise<Either<Error, UploadStatusValue>> {
    const upload = await this.uploadRepository.findById(uploadId);
    if (upload === null) {
      return Either.left(new NotFoundError(`No existe un upload con id ${uploadId}`));
    }
    if (isFinished(upload)) {
      return Either.right(upload.status.value);
    }
    const failedOrError = upload.markAsFailed(FAILED_AFTER_RETRIES_MESSAGE);
    if (failedOrError.isLeft()) {
      return Either.left(failedOrError.value);
    }
    await this.uploadRepository.save(upload);
    return Either.right(upload.status.value);
  }
}

// COMPLETED y FAILED son finales: desde ahí ya no se puede volver a PROCESSING
function isFinished(upload: Upload): boolean {
  return !upload.status.canTransitionTo(UploadStatus.PROCESSING);
}

// Decisión del autor: si ninguna fila es válida, FAILED; COMPLETED con 0 filas engañaría
function applyResult(
  upload: Upload,
  summaryOrError: Either<ValidationError, ProcessingSummary>,
): Either<ValidationError, void> {
  if (summaryOrError.isLeft()) {
    return upload.markAsFailed(summaryOrError.value.message);
  }
  const summary = summaryOrError.value;
  if (summary.processedRows === 0) {
    return upload.markAsFailed(`Ninguna de las ${summary.totalRows} filas es válida: revisá los errores por fila`);
  }
  return upload.markAsCompleted(summary);
}
