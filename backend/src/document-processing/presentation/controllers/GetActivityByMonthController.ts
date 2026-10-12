import { IQueryHandler } from "../../../shared/application/IQueryHandler";
import { BaseController } from "../../../shared/infrastructure/http/BaseController";
import { IHttpRequest } from "../../../shared/infrastructure/http/IHttpRequest";
import { IHttpResponse } from "../../../shared/infrastructure/http/IHttpResponse";
import { readUserId } from "../../../shared/infrastructure/http/readUserId";
import { ActivityByMonthView } from "../../application/queries/handlers/GetActivityByMonthQueryHandler";
import { GetActivityByMonthQuery } from "../../application/queries/objects/GetActivityByMonthQuery";

export class GetActivityByMonthController extends BaseController {
  constructor(private readonly getActivityByMonthQueryHandler: IQueryHandler<GetActivityByMonthQuery, ActivityByMonthView>) {
    super();
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse> {
    return this.respond(await this.getActivityByMonthQueryHandler.execute(new GetActivityByMonthQuery(readUserId(request))));
  }
}
