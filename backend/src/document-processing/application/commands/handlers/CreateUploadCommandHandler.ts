import { ICommandHandler } from "../../../../shared/application/ICommandHandler";
import { Either } from "../../../../shared/domain/Either";
import { ConflictError, DuplicateIdempotencyKeyError, ValidationError } from "../../../../shared/domain/errors";
import { IMessagePublisher } from "../../../../shared/infrastructure/messaging/IMessagePublisher";
import { IFileStorage } from "../../../../shared/infrastructure/storage/IFileStorage";
import { Upload } from "../../../domain/entities/Upload";
import { IUploadRepository } from "../../../domain/repositories/IUploadRepository";
import { CsvHeader } from "../../../domain/value-objects/CsvHeader";
import { FileName } from "../../../domain/value-objects/FileName";
import { IdempotencyKey } from "../../../domain/value-objects/IdempotencyKey";
import { UploadStatusValue } from "../../../domain/value-objects/UploadStatus";
import { CreateUploadCommand, UploadedFile } from "../objects/CreateUploadCommand";

// El comprobante: "recibido y en la fila", no "procesado"
export type UploadReceipt = {
  id: string;
  status: UploadStatusValue;
  fileName: string;
  createdAt: string; // ISO 8601
};

export const ENQUEUE_FAILED_MESSAGE = "No se pudo encolar el archivo para procesarlo";

type ValidUpload = { fileName: FileName; content: Buffer; idempotencyKey: IdempotencyKey | null };

export class CreateUploadCommandHandler implements ICommandHandler<CreateUploadCommand, UploadReceipt> {
  constructor(
    private readonly fileStorage: IFileStorage,
    private readonly uploadRepository: IUploadRepository,
    private readonly messagePublisher: IMessagePublisher,
  ) {}

  // El upload se guarda antes de publicar: el worker nunca recibe el id de un upload que no existe
  async execute(command: CreateUploadCommand): Promise<Either<Error, UploadReceipt>> {
    const validOrError = validateCommand(command);
    if (validOrError.isLeft()) {
      return Either.left(validOrError.value);
    }
    const { fileName, content, idempotencyKey } = validOrError.value;

    // Reintento con una clave ya usada: se devuelve el upload que ya existe
    const existing = idempotencyKey === null ? null : await this.uploadRepository.findByIdempotencyKey(idempotencyKey.value);
    if (existing !== null) {
      return receiptFor(existing, command.userId);
    }

    const location = await this.fileStorage.save(content);
    const uploadOrError = Upload.create({ fileName, fileUrl: location, userId: command.userId, idempotencyKey });
    if (uploadOrError.isLeft()) {
      return Either.left(uploadOrError.value);
    }
    const winner = await this.saveOrFindWinner(uploadOrError.value);
    if (winner !== null) {
      return receiptFor(winner, command.userId);
    }
    await this.publishOrMarkAsFailed(uploadOrError.value);
    return Either.right(toReceipt(uploadOrError.value));
  }

  // Dos envíos simultáneos con la misma clave: el índice único deja pasar uno. El que pierde
  // devuelve el upload ganador (que ya publica su propio mensaje). Devuelve null si se guardó.
  private async saveOrFindWinner(upload: Upload): Promise<Upload | null> {
    try {
      await this.uploadRepository.save(upload);
      return null;
    } catch (error) {
      if (!(error instanceof DuplicateIdempotencyKeyError) || upload.idempotencyKey === null) {
        throw error;
      }
      const winner = await this.uploadRepository.findByIdempotencyKey(upload.idempotencyKey);
      if (winner === null) {
        throw error;
      }
      return winner;
    }
  }

  // Si no se puede encolar, nadie va a procesar el upload: se marca FAILED para que no quede en
  // PENDING para siempre, y se relanza el error para que la API responda 500 y quede en el log
  private async publishOrMarkAsFailed(upload: Upload): Promise<void> {
    try {
      await this.messagePublisher.publish({ uploadId: upload.id });
    } catch (error) {
      upload.markAsFailed(ENQUEUE_FAILED_MESSAGE); // PENDING -> FAILED siempre está permitida
      await this.uploadRepository.save(upload);
      throw error;
    }
  }
}

// Todo lo que se puede validar al instante, antes de guardar nada
function validateCommand(command: CreateUploadCommand): Either<ValidationError, ValidUpload> {
  const fileOrError = validateFile(command.file);
  if (fileOrError.isLeft()) {
    return Either.left(fileOrError.value);
  }
  if (command.idempotencyKey === null) {
    return Either.right({ ...fileOrError.value, idempotencyKey: null });
  }
  const keyOrError = IdempotencyKey.create(command.idempotencyKey);
  if (keyOrError.isLeft()) {
    return Either.left(keyOrError.value);
  }
  return Either.right({ ...fileOrError.value, idempotencyKey: keyOrError.value });
}

function validateFile(file: UploadedFile | null): Either<ValidationError, { fileName: FileName; content: Buffer }> {
  if (file === null) {
    return Either.left(new ValidationError('Falta el archivo: enviá un CSV en el campo "file"'));
  }
  const fileNameOrError = FileName.create(file.fileName);
  if (fileNameOrError.isLeft()) {
    return Either.left(fileNameOrError.value);
  }
  if (file.content.length === 0) {
    return Either.left(new ValidationError("El archivo está vacío"));
  }
  const headerOrError = CsvHeader.fromContent(file.content);
  if (headerOrError.isLeft()) {
    return Either.left(headerOrError.value);
  }
  return Either.right({ fileName: fileNameOrError.value, content: file.content });
}

// Una clave ya usada devuelve ese upload, pero solo a su dueño: a otro usuario no se le muestra
function receiptFor(upload: Upload, userId: string): Either<Error, UploadReceipt> {
  if (upload.userId !== userId) {
    return Either.left(new ConflictError("Esa clave de idempotencia ya se usó para otro upload"));
  }
  return Either.right(toReceipt(upload));
}

function toReceipt(upload: Upload): UploadReceipt {
  return {
    id: upload.id,
    status: upload.status.value,
    fileName: upload.fileName.value,
    createdAt: upload.createdAt.toISOString(),
  };
}
