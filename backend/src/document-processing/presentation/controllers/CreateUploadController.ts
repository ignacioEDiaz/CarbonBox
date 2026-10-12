import { ICommandHandler } from "../../../shared/application/ICommandHandler";
import { BaseController } from "../../../shared/infrastructure/http/BaseController";
import { IHttpRequest } from "../../../shared/infrastructure/http/IHttpRequest";
import { IHttpResponse } from "../../../shared/infrastructure/http/IHttpResponse";
import { readUserId } from "../../../shared/infrastructure/http/readUserId";
import { UploadReceipt } from "../../application/commands/handlers/CreateUploadCommandHandler";
import { CreateUploadCommand } from "../../application/commands/objects/CreateUploadCommand";

export class CreateUploadController extends BaseController {
  constructor(private readonly createUploadCommandHandler: ICommandHandler<CreateUploadCommand, UploadReceipt>) {
    super();
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse> {
    const command = new CreateUploadCommand(request.file ?? null, readUserId(request), readIdempotencyKey(request.headers));
    const result = await this.createUploadCommandHandler.execute(command);
    // 202 Accepted: recibido y en la fila, todavía sin procesar
    return this.respond(result, 202);
  }
}

// headers llega como unknown. Fastify pasa los nombres a minúsculas; si el header se repite,
// llega como lista y se ignora
function readIdempotencyKey(headers: unknown): string | null {
  if (typeof headers === "object" && headers !== null && "idempotency-key" in headers) {
    const value = headers["idempotency-key"];
    return typeof value === "string" ? value : null;
  }
  return null;
}
