import { Either } from "../domain/Either";

// Contrato de los handlers de lectura (CQRS)
export interface IQueryHandler<TQuery, TResult> {
  execute(query: TQuery): Promise<Either<Error, TResult>>;
}
