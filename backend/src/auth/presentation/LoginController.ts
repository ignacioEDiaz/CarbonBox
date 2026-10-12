import { IQueryHandler } from "../../shared/application/IQueryHandler";
import { BaseController } from "../../shared/infrastructure/http/BaseController";
import { IHttpRequest } from "../../shared/infrastructure/http/IHttpRequest";
import { IHttpResponse } from "../../shared/infrastructure/http/IHttpResponse";
import { readBodyText } from "../../shared/infrastructure/http/readBodyText";
import { Session } from "../application/queries/handlers/LoginQueryHandler";
import { LoginQuery } from "../application/queries/objects/LoginQuery";

export class LoginController extends BaseController {
  constructor(private readonly loginQueryHandler: IQueryHandler<LoginQuery, Session>) {
    super();
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse> {
    const query = new LoginQuery(readBodyText(request.body, "email"), readBodyText(request.body, "password"));
    return this.respond(await this.loginQueryHandler.execute(query));
  }
}
