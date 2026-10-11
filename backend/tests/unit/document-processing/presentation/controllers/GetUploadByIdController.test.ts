import { UploadView } from "../../../../../src/document-processing/application/queries/handlers/GetUploadByIdQueryHandler";
import { GetUploadByIdQuery } from "../../../../../src/document-processing/application/queries/objects/GetUploadByIdQuery";
import { GetUploadByIdController } from "../../../../../src/document-processing/presentation/controllers/GetUploadByIdController";
import { IQueryHandler } from "../../../../../src/shared/application/IQueryHandler";
import { Either } from "../../../../../src/shared/domain/Either";
import { NotFoundError } from "../../../../../src/shared/domain/errors";
import { IHttpRequest } from "../../../../../src/shared/infrastructure/http/IHttpRequest";

const VIEW: UploadView = {
  id: "8b0e5c0e-3a52-4c0e-9d53-0d2a0f1c7a11",
  status: "PENDING",
  fileName: "datos.csv",
  totalRows: null,
  processedRows: null,
  failedRows: null,
  errorMessage: null,
  createdAt: "2026-10-11T18:30:00.000Z",
  updatedAt: "2026-10-11T18:30:00.000Z",
};

class HandlerDouble implements IQueryHandler<GetUploadByIdQuery, UploadView> {
  received: GetUploadByIdQuery | null = null;

  constructor(private readonly result: Either<Error, UploadView>) {}

  async execute(query: GetUploadByIdQuery): Promise<Either<Error, UploadView>> {
    this.received = query;
    return this.result;
  }
}

function request(params: unknown): IHttpRequest {
  return { params, query: {}, body: undefined, headers: {} };
}

describe("GetUploadByIdController", () => {
  it("arma la query con el id de la ruta y responde 200 con la vista", async () => {
    const handler = new HandlerDouble(Either.right(VIEW));

    const response = await new GetUploadByIdController(handler).handle(request({ id: VIEW.id }));

    expect(handler.received).toEqual(new GetUploadByIdQuery(VIEW.id));
    expect(response).toEqual({ statusCode: 200, body: VIEW });
  });

  it("si params no trae un id de texto, pasa un id vacío (que no existe)", async () => {
    const handler = new HandlerDouble(Either.right(VIEW));

    await new GetUploadByIdController(handler).handle(request(undefined));

    expect(handler.received).toEqual(new GetUploadByIdQuery(""));
  });

  it("un left lanza el error para el manejador central", async () => {
    const error = new NotFoundError("No existe un upload con id x");
    const controller = new GetUploadByIdController(new HandlerDouble(Either.left(error)));

    await expect(controller.handle(request({ id: "x" }))).rejects.toBe(error);
  });
});
