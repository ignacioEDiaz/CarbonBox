import { IQueryHandler } from "../../../../shared/application/IQueryHandler";
import { Either } from "../../../../shared/domain/Either";
import { ValidationError } from "../../../../shared/domain/errors";
import { IUploadRepository } from "../../../domain/repositories/IUploadRepository";
import { ListUploadsQuery } from "../objects/ListUploadsQuery";
import { toUploadView, UploadView } from "./GetUploadByIdQueryHandler";

export type UploadListView = { data: UploadView[]; total: number; page: number; limit: number };

const DEFAULT_LIMIT = 10; // la consigna pide 10 por página
const MAX_LIMIT = 100;

export class ListUploadsQueryHandler implements IQueryHandler<ListUploadsQuery, UploadListView> {
  constructor(private readonly uploadRepository: IUploadRepository) {}

  async execute(query: ListUploadsQuery): Promise<Either<Error, UploadListView>> {
    const page = parsePositiveInt(query.page ?? "1");
    if (page === null) {
      return Either.left(new ValidationError("page debe ser un entero mayor o igual a 1"));
    }
    const limit = parsePositiveInt(query.limit ?? String(DEFAULT_LIMIT));
    if (limit === null || limit > MAX_LIMIT) {
      return Either.left(new ValidationError(`limit debe ser un entero entre 1 y ${MAX_LIMIT}`));
    }
    const { uploads, total } = await this.uploadRepository.findPageByUserId(query.userId, {
      skip: (page - 1) * limit,
      take: limit,
    });
    return Either.right({ data: uploads.map(toUploadView), total, page, limit });
  }
}

// Solo dígitos: rechaza "abc", "1.5", "-1" y "" en vez de convertirlos en silencio
function parsePositiveInt(text: string): number | null {
  if (!/^\d+$/.test(text)) {
    return null;
  }
  const value = Number(text);
  return value >= 1 ? value : null;
}
