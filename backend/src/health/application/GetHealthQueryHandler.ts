import { IQueryHandler } from "../../shared/application/IQueryHandler";
import { Either } from "../../shared/domain/Either";
import { GetHealthQuery } from "./GetHealthQuery";
import { IDatabaseHealthChecker } from "./IDatabaseHealthChecker";

export type HealthStatus = {
  service: "up";
  database: "up" | "down";
};

export class GetHealthQueryHandler implements IQueryHandler<GetHealthQuery, HealthStatus> {
  constructor(private readonly databaseHealthChecker: IDatabaseHealthChecker) {}

  // Si este código se ejecuta, el servicio está vivo; solo falta preguntar por la base
  async execute(_query: GetHealthQuery): Promise<Either<Error, HealthStatus>> {
    const isDatabaseUp = await this.databaseHealthChecker.isUp();
    return Either.right({ service: "up", database: isDatabaseUp ? "up" : "down" });
  }
}
