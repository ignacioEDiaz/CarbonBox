import { IQueryHandler } from "../../shared/application/IQueryHandler";
import { BaseController } from "../../shared/infrastructure/http/BaseController";
import { IHttpResponse } from "../../shared/infrastructure/http/IHttpResponse";
import { GetHealthQuery } from "../application/GetHealthQuery";
import { HealthStatus } from "../application/GetHealthQueryHandler";

export class HealthController extends BaseController {
  constructor(
    private readonly getHealthQueryHandler: IQueryHandler<GetHealthQuery, HealthStatus>,
  ) {
    super();
  }

  async handle(): Promise<IHttpResponse> {
    const result = await this.getHealthQueryHandler.execute(new GetHealthQuery());
    // 503 le avisa a quien monitorea (por ejemplo, un load balancer) que el servicio no está sano
    const isDatabaseDown = result.isRight() && result.value.database === "down";
    return this.respond(result, isDatabaseDown ? 503 : 200);
  }
}
