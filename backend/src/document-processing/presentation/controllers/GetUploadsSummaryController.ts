import { IQueryHandler } from "../../../shared/application/IQueryHandler";
import { BaseController } from "../../../shared/infrastructure/http/BaseController";
import { IHttpRequest } from "../../../shared/infrastructure/http/IHttpRequest";
import { IHttpResponse } from "../../../shared/infrastructure/http/IHttpResponse";
import { readUserId } from "../../../shared/infrastructure/http/readUserId";
import { UploadsSummaryView } from "../../application/queries/handlers/GetUploadsSummaryQueryHandler";
import { GetUploadsSummaryQuery } from "../../application/queries/objects/GetUploadsSummaryQuery";

export class GetUploadsSummaryController extends BaseController {
  constructor(private readonly getUploadsSummaryQueryHandler: IQueryHandler<GetUploadsSummaryQuery, UploadsSummaryView>) {
    super();
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse> {
    return this.respond(await this.getUploadsSummaryQueryHandler.execute(new GetUploadsSummaryQuery(readUserId(request))));
  }
}
