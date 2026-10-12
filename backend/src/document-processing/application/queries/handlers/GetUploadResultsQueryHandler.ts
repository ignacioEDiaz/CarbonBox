import { IQueryHandler } from "../../../../shared/application/IQueryHandler";
import { Either } from "../../../../shared/domain/Either";
import { NotFoundError } from "../../../../shared/domain/errors";
import { IActivityDataRepository } from "../../../domain/repositories/IActivityDataRepository";
import { IUploadRepository } from "../../../domain/repositories/IUploadRepository";
import { GetUploadResultsQuery } from "../objects/GetUploadResultsQuery";

// El formato de la consigna: sin ids internos ni el upload al que pertenecen
export type UploadResultsView = {
  data: { category: string; amount: number; unit: string; date: string }[];
};

export class GetUploadResultsQueryHandler implements IQueryHandler<GetUploadResultsQuery, UploadResultsView> {
  constructor(
    private readonly uploadRepository: IUploadRepository,
    private readonly activityDataRepository: IActivityDataRepository,
  ) {}

  async execute(query: GetUploadResultsQuery): Promise<Either<Error, UploadResultsView>> {
    // Sin esto, un id inexistente o ajeno respondería { data: [] } como si no tuviera filas
    const upload = await this.uploadRepository.findById(query.uploadId);
    if (upload === null || upload.userId !== query.userId) {
      return Either.left(new NotFoundError(`No existe un upload con id ${query.uploadId}`));
    }
    const rows = await this.activityDataRepository.findByUploadId(query.uploadId);
    return Either.right({
      data: rows.map(({ category, amount, unit, date }) => ({ category, amount, unit, date })),
    });
  }
}
