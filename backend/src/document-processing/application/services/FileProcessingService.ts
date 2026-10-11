import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { IFileStorage } from "../../../shared/infrastructure/storage/IFileStorage";
import { Upload } from "../../domain/entities/Upload";
import { IActivityDataRepository } from "../../domain/repositories/IActivityDataRepository";
import { IRowErrorRepository } from "../../domain/repositories/IRowErrorRepository";
import { ICsvParserService } from "./ICsvParserService";
import { IFileProcessingService, ProcessingSummary } from "./IFileProcessingService";

// No toca el estado del upload: eso lo decide ProcessFileCommandHandler con este resultado
export class FileProcessingService implements IFileProcessingService {
  constructor(
    private readonly fileStorage: IFileStorage,
    private readonly csvParserService: ICsvParserService,
    private readonly activityDataRepository: IActivityDataRepository,
    private readonly rowErrorRepository: IRowErrorRepository,
  ) {}

  async process(upload: Upload): Promise<Either<ValidationError, ProcessingSummary>> {
    const content = await this.fileStorage.read(upload.fileUrl);
    const parsedOrError = this.csvParserService.parse(content, upload.id);
    if (parsedOrError.isLeft()) {
      return Either.left(parsedOrError.value);
    }
    const { validRows, rowErrors, totalRows } = parsedOrError.value;
    // Los dos reemplazan lo de un intento anterior: un reintento no duplica nada
    await this.activityDataRepository.saveForUpload(upload.id, validRows);
    await this.rowErrorRepository.saveForUpload(upload.id, rowErrors);
    return Either.right({ totalRows, processedRows: validRows.length, failedRows: rowErrors.length });
  }
}
