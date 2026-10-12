import { IQueryHandler } from "../../../shared/application/IQueryHandler";
import { BaseController } from "../../../shared/infrastructure/http/BaseController";
import { IHttpRequest } from "../../../shared/infrastructure/http/IHttpRequest";
import { IHttpResponse } from "../../../shared/infrastructure/http/IHttpResponse";
import { readUserId } from "../../../shared/infrastructure/http/readUserId";
import { UploadListView } from "../../application/queries/handlers/ListUploadsQueryHandler";
import { ListUploadsQuery } from "../../application/queries/objects/ListUploadsQuery";

export class ListUploadsController extends BaseController {
  constructor(private readonly listUploadsQueryHandler: IQueryHandler<ListUploadsQuery, UploadListView>) {
    super();
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse> {
    const query = new ListUploadsQuery(readUserId(request), readText(request.query, "page"), readText(request.query, "limit"));
    return this.respond(await this.listUploadsQueryHandler.execute(query));
  }
}

// query llega como unknown. Solo se pasa el texto: validar el número es trabajo del handler
function readText(query: unknown, name: string): string | undefined {
  if (typeof query === "object" && query !== null && name in query) {
    const value: unknown = Reflect.get(query, name);
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}
