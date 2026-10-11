import { ICommandHandler } from "../../../shared/application/ICommandHandler";
import { BaseController } from "../../../shared/infrastructure/http/BaseController";
import { IHttpRequest } from "../../../shared/infrastructure/http/IHttpRequest";
import { IHttpResponse } from "../../../shared/infrastructure/http/IHttpResponse";
import { UploadReceipt } from "../../application/commands/handlers/CreateUploadCommandHandler";
import { CreateUploadCommand } from "../../application/commands/objects/CreateUploadCommand";

// Sin autenticación: identificar al usuario es tarea de la puerta de entrada. El día que haya
// login, este valor sale del token y el handler no cambia.
const USER_ID = "user-123";

export class CreateUploadController extends BaseController {
  constructor(private readonly createUploadCommandHandler: ICommandHandler<CreateUploadCommand, UploadReceipt>) {
    super();
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse> {
    const command = new CreateUploadCommand(request.file ?? null, USER_ID);
    const result = await this.createUploadCommandHandler.execute(command);
    // 202 Accepted: recibido y en la fila, todavía sin procesar
    return this.respond(result, 202);
  }
}
