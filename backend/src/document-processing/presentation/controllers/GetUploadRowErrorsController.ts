import { IQueryHandler } from "../../../shared/application/IQueryHandler";
import { BaseController } from "../../../shared/infrastructure/http/BaseController";
import { IHttpRequest } from "../../../shared/infrastructure/http/IHttpRequest";
import { IHttpResponse } from "../../../shared/infrastructure/http/IHttpResponse";
import { readIdParam } from "../../../shared/infrastructure/http/readIdParam";
import { readUserId } from "../../../shared/infrastructure/http/readUserId";
import { RowErrorsView } from "../../application/queries/handlers/GetUploadRowErrorsQueryHandler";
import { GetUploadRowErrorsQuery } from "../../application/queries/objects/GetUploadRowErrorsQuery";

export class GetUploadRowErrorsController extends BaseController {
  constructor(private readonly getUploadRowErrorsQueryHandler: IQueryHandler<GetUploadRowErrorsQuery, RowErrorsView>) {
    super();
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse> {
    const result = await this.getUploadRowErrorsQueryHandler.execute(new GetUploadRowErrorsQuery(readIdParam(request.params), readUserId(request)));
    return this.respond(result);
  }
}
