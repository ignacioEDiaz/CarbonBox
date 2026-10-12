import { IQueryHandler } from "../../../../shared/application/IQueryHandler";
import { Either } from "../../../../shared/domain/Either";
import { IUploadRepository } from "../../../domain/repositories/IUploadRepository";
import { GetUploadsSummaryQuery } from "../objects/GetUploadsSummaryQuery";

// Lo que muestra el dashboard: cuántos uploads tiene el usuario y cuántos en cada estado
export type UploadsSummaryView = {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
};

export class GetUploadsSummaryQueryHandler implements IQueryHandler<GetUploadsSummaryQuery, UploadsSummaryView> {
  constructor(private readonly uploadRepository: IUploadRepository) {}

  async execute(query: GetUploadsSummaryQuery): Promise<Either<Error, UploadsSummaryView>> {
    const counts = await this.uploadRepository.countByStatusForUser(query.userId);
    return Either.right({
      total: counts.PENDING + counts.PROCESSING + counts.COMPLETED + counts.FAILED,
      pending: counts.PENDING,
      processing: counts.PROCESSING,
      completed: counts.COMPLETED,
      failed: counts.FAILED,
    });
  }
}
