import { IQueryHandler } from "../../../shared/application/IQueryHandler";
import { BaseController } from "../../../shared/infrastructure/http/BaseController";
import { IHttpRequest } from "../../../shared/infrastructure/http/IHttpRequest";
import { IHttpResponse } from "../../../shared/infrastructure/http/IHttpResponse";
import { readIdParam } from "../../../shared/infrastructure/http/readIdParam";
import { readUserId } from "../../../shared/infrastructure/http/readUserId";
import { UploadResultsView } from "../../application/queries/handlers/GetUploadResultsQueryHandler";
import { GetUploadResultsQuery } from "../../application/queries/objects/GetUploadResultsQuery";

export class GetUploadResultsController extends BaseController {
  constructor(private readonly getUploadResultsQueryHandler: IQueryHandler<GetUploadResultsQuery, UploadResultsView>) {
    super();
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse> {
    const result = await this.getUploadResultsQueryHandler.execute(new GetUploadResultsQuery(readIdParam(request.params), readUserId(request)));
    return this.respond(result);
  }
}
