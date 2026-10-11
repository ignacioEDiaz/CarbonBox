import { UploadReceipt } from "../../../../../src/document-processing/application/commands/handlers/CreateUploadCommandHandler";
import { CreateUploadCommand } from "../../../../../src/document-processing/application/commands/objects/CreateUploadCommand";
import { CreateUploadController } from "../../../../../src/document-processing/presentation/controllers/CreateUploadController";
import { ICommandHandler } from "../../../../../src/shared/application/ICommandHandler";
import { Either } from "../../../../../src/shared/domain/Either";
import { ValidationError } from "../../../../../src/shared/domain/errors";
import { IHttpRequest } from "../../../../../src/shared/infrastructure/http/IHttpRequest";

const RECEIPT: UploadReceipt = {
  id: "8b0e5c0e-3a52-4c0e-9d53-0d2a0f1c7a11",
  status: "PENDING",
  fileName: "datos.csv",
  createdAt: "2026-10-11T18:30:00.000Z",
};

// Doble del handler: guarda el command que recibió y devuelve lo que se le indique
class HandlerDouble implements ICommandHandler<CreateUploadCommand, UploadReceipt> {
  received: CreateUploadCommand | null = null;

  constructor(private readonly result: Either<Error, UploadReceipt>) {}

  async execute(command: CreateUploadCommand): Promise<Either<Error, UploadReceipt>> {
    this.received = command;
    return this.result;
  }
}

function request(file?: IHttpRequest["file"]): IHttpRequest {
  return { params: {}, query: {}, body: undefined, headers: {}, file };
}

describe("CreateUploadController", () => {
  it("arma el command con el archivo de la petición y el usuario user-123", async () => {
    const handler = new HandlerDouble(Either.right(RECEIPT));
    const file = { fileName: "datos.csv", content: Buffer.from("category,amount,unit,date\n") };

    await new CreateUploadController(handler).handle(request(file));

    expect(handler.received).toEqual(new CreateUploadCommand(file, "user-123"));
  });

  it("si la petición no trajo archivo, pasa null: decide el handler", async () => {
    const handler = new HandlerDouble(Either.right(RECEIPT));

    await new CreateUploadController(handler).handle(request());

    expect(handler.received?.file).toBeNull();
  });

  it("responde 202 con el comprobante", async () => {
    const controller = new CreateUploadController(new HandlerDouble(Either.right(RECEIPT)));

    await expect(controller.handle(request())).resolves.toEqual({ statusCode: 202, body: RECEIPT });
  });

  it("un left lanza el error para el manejador central", async () => {
    const error = new ValidationError("El archivo está vacío");
    const controller = new CreateUploadController(new HandlerDouble(Either.left(error)));

    await expect(controller.handle(request())).rejects.toBe(error);
  });
});
