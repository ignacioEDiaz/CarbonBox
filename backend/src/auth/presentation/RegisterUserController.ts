import { ICommandHandler } from "../../shared/application/ICommandHandler";
import { BaseController } from "../../shared/infrastructure/http/BaseController";
import { IHttpRequest } from "../../shared/infrastructure/http/IHttpRequest";
import { IHttpResponse } from "../../shared/infrastructure/http/IHttpResponse";
import { readBodyText } from "../../shared/infrastructure/http/readBodyText";
import { RegisteredUser } from "../application/commands/handlers/RegisterUserCommandHandler";
import { RegisterUserCommand } from "../application/commands/objects/RegisterUserCommand";

export class RegisterUserController extends BaseController {
  constructor(private readonly registerUserCommandHandler: ICommandHandler<RegisterUserCommand, RegisteredUser>) {
    super();
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse> {
    const command = new RegisterUserCommand(readBodyText(request.body, "email"), readBodyText(request.body, "password"));
    return this.respond(await this.registerUserCommandHandler.execute(command), 201);
  }
}
