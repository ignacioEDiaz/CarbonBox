import { Either } from "../domain/Either";

// Contrato de los handlers de escritura (CQRS)
export interface ICommandHandler<TCommand, TResult> {
  execute(command: TCommand): Promise<Either<Error, TResult>>;
}
