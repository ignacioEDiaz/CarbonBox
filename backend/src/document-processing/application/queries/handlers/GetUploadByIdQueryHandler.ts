import { IQueryHandler } from "../../../../shared/application/IQueryHandler";
import { Either } from "../../../../shared/domain/Either";
import { NotFoundError } from "../../../../shared/domain/errors";
import { Upload } from "../../../domain/entities/Upload";
import { IUploadRepository } from "../../../domain/repositories/IUploadRepository";
import { UploadStatusValue } from "../../../domain/value-objects/UploadStatus";
import { GetUploadByIdQuery } from "../objects/GetUploadByIdQuery";

// Lo que ve el cliente: datos planos, sin la ubicación interna del archivo ni el usuario.
// El handler devuelve esto y no la entidad, para que presentation no dependa del dominio.
export type UploadView = {
  id: string;
  status: UploadStatusValue;
  fileName: string;
  totalRows: number | null;
  processedRows: number | null;
  failedRows: number | null;
  errorMessage: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

export class GetUploadByIdQueryHandler implements IQueryHandler<GetUploadByIdQuery, UploadView> {
  constructor(private readonly uploadRepository: IUploadRepository) {}

  async execute(query: GetUploadByIdQuery): Promise<Either<Error, UploadView>> {
    const upload = await this.uploadRepository.findById(query.id);
    if (upload === null) {
      return Either.left(new NotFoundError(`No existe un upload con id ${query.id}`));
    }
    return Either.right(toUploadView(upload));
  }
}

// La comparte la lista (ListUploadsQueryHandler): el detalle y la lista no pueden divergir
export function toUploadView(upload: Upload): UploadView {
  return {
    id: upload.id,
    status: upload.status.value,
    fileName: upload.fileName.value,
    totalRows: upload.totalRows,
    processedRows: upload.processedRows,
    failedRows: upload.failedRows,
    errorMessage: upload.errorMessage,
    createdAt: upload.createdAt.toISOString(),
    updatedAt: upload.updatedAt.toISOString(),
  };
}
