import { IQueryHandler } from "../../../../shared/application/IQueryHandler";
import { Either } from "../../../../shared/domain/Either";
import { IActivityDataRepository, MonthlyRows } from "../../../domain/repositories/IActivityDataRepository";
import { GetActivityByMonthQuery } from "../objects/GetActivityByMonthQuery";

// El gráfico del dashboard: filas de actividad por mes. Se cuentan filas y no se suma amount
// porque cada categoría tiene otra unidad (kWh, m3, litros): sumarlas no tiene sentido.
export type ActivityByMonthView = { data: MonthlyRows[] };

export class GetActivityByMonthQueryHandler implements IQueryHandler<GetActivityByMonthQuery, ActivityByMonthView> {
  constructor(private readonly activityDataRepository: IActivityDataRepository) {}

  async execute(query: GetActivityByMonthQuery): Promise<Either<Error, ActivityByMonthView>> {
    return Either.right({ data: await this.activityDataRepository.countByMonthForUser(query.userId) });
  }
}
