import { IQueryHandler } from "../../../../shared/application/IQueryHandler";
import { Either } from "../../../../shared/domain/Either";
import { NotFoundError } from "../../../../shared/domain/errors";
import { IRowErrorRepository } from "../../../domain/repositories/IRowErrorRepository";
import { IUploadRepository } from "../../../domain/repositories/IUploadRepository";
import { GetUploadRowErrorsQuery } from "../objects/GetUploadRowErrorsQuery";

// Lo que ve el cliente: la línea del archivo y el motivo de cada fila rechazada
export type RowErrorsView = { data: { line: number; message: string }[] };

// La lectura de los errores que guardó el procesamiento (CQRS: escribe el command, lee la query)
export class GetUploadRowErrorsQueryHandler implements IQueryHandler<GetUploadRowErrorsQuery, RowErrorsView> {
  constructor(
    private readonly uploadRepository: IUploadRepository,
    private readonly rowErrorRepository: IRowErrorRepository,
  ) {}

  async execute(query: GetUploadRowErrorsQuery): Promise<Either<Error, RowErrorsView>> {
    // Sin esto, un id inexistente o ajeno respondería { data: [] } como si no tuviera errores
    const upload = await this.uploadRepository.findById(query.uploadId);
    if (upload === null || upload.userId !== query.userId) {
      return Either.left(new NotFoundError(`No existe un upload con id ${query.uploadId}`));
    }
    const errors = await this.rowErrorRepository.findByUploadId(query.uploadId);
    return Either.right({ data: errors.map(({ line, message }) => ({ line, message })) });
  }
}
