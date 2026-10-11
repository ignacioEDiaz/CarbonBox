import { ICommandHandler } from "../../../../shared/application/ICommandHandler";
import { Either } from "../../../../shared/domain/Either";
import { ValidationError } from "../../../../shared/domain/errors";
import { IMessagePublisher } from "../../../../shared/infrastructure/messaging/IMessagePublisher";
import { IFileStorage } from "../../../../shared/infrastructure/storage/IFileStorage";
import { Upload } from "../../../domain/entities/Upload";
import { IUploadRepository } from "../../../domain/repositories/IUploadRepository";
import { CsvHeader } from "../../../domain/value-objects/CsvHeader";
import { FileName } from "../../../domain/value-objects/FileName";
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

type ValidFile = { fileName: FileName; content: Buffer };

export class CreateUploadCommandHandler implements ICommandHandler<CreateUploadCommand, UploadReceipt> {
  constructor(
    private readonly fileStorage: IFileStorage,
    private readonly uploadRepository: IUploadRepository,
    private readonly messagePublisher: IMessagePublisher,
  ) {}

  // El upload se guarda antes de publicar: el worker nunca recibe el id de un upload que no existe
  async execute(command: CreateUploadCommand): Promise<Either<Error, UploadReceipt>> {
    const fileOrError = validateFile(command.file);
    if (fileOrError.isLeft()) {
      return Either.left(fileOrError.value);
    }
    const { fileName, content } = fileOrError.value;

    const location = await this.fileStorage.save(content);
    const uploadOrError = Upload.create({ fileName, fileUrl: location, userId: command.userId });
    if (uploadOrError.isLeft()) {
      return Either.left(uploadOrError.value);
    }
    const upload = uploadOrError.value;
    await this.uploadRepository.save(upload);
    await this.publishOrMarkAsFailed(upload);

    return Either.right(toReceipt(upload));
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
function validateFile(file: UploadedFile | null): Either<ValidationError, ValidFile> {
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

function toReceipt(upload: Upload): UploadReceipt {
  return {
    id: upload.id,
    status: upload.status.value,
    fileName: upload.fileName.value,
    createdAt: upload.createdAt.toISOString(),
  };
}
