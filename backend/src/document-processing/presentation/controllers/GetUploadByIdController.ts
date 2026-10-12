import { IQueryHandler } from "../../../shared/application/IQueryHandler";
import { BaseController } from "../../../shared/infrastructure/http/BaseController";
import { IHttpRequest } from "../../../shared/infrastructure/http/IHttpRequest";
import { IHttpResponse } from "../../../shared/infrastructure/http/IHttpResponse";
import { readIdParam } from "../../../shared/infrastructure/http/readIdParam";
import { UploadView } from "../../application/queries/handlers/GetUploadByIdQueryHandler";
import { GetUploadByIdQuery } from "../../application/queries/objects/GetUploadByIdQuery";

export class GetUploadByIdController extends BaseController {
  constructor(private readonly getUploadByIdQueryHandler: IQueryHandler<GetUploadByIdQuery, UploadView>) {
    super();
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse> {
    const result = await this.getUploadByIdQueryHandler.execute(new GetUploadByIdQuery(readIdParam(request.params)));
    return this.respond(result);
  }
}
