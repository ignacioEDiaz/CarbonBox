import { IQueryHandler } from "../../../shared/application/IQueryHandler";
import { BaseController } from "../../../shared/infrastructure/http/BaseController";
import { IHttpRequest } from "../../../shared/infrastructure/http/IHttpRequest";
import { IHttpResponse } from "../../../shared/infrastructure/http/IHttpResponse";
import { UploadView } from "../../application/queries/handlers/GetUploadByIdQueryHandler";
import { GetUploadByIdQuery } from "../../application/queries/objects/GetUploadByIdQuery";

export class GetUploadByIdController extends BaseController {
  constructor(private readonly getUploadByIdQueryHandler: IQueryHandler<GetUploadByIdQuery, UploadView>) {
    super();
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse> {
    const result = await this.getUploadByIdQueryHandler.execute(new GetUploadByIdQuery(readId(request.params)));
    return this.respond(result);
  }
}

// params llega como unknown. Si no trae un id de texto, se pasa "" y el handler responde
// "no encontrado", igual que con cualquier id inexistente.
function readId(params: unknown): string {
  if (typeof params === "object" && params !== null && "id" in params && typeof params.id === "string") {
    return params.id;
  }
  return "";
}
