import { RowErrorsView } from "../../../../../src/document-processing/application/queries/handlers/GetUploadRowErrorsQueryHandler";
import { GetUploadRowErrorsQuery } from "../../../../../src/document-processing/application/queries/objects/GetUploadRowErrorsQuery";
import { GetUploadRowErrorsController } from "../../../../../src/document-processing/presentation/controllers/GetUploadRowErrorsController";
import { IQueryHandler } from "../../../../../src/shared/application/IQueryHandler";
import { Either } from "../../../../../src/shared/domain/Either";
import { NotFoundError } from "../../../../../src/shared/domain/errors";

class HandlerDouble implements IQueryHandler<GetUploadRowErrorsQuery, RowErrorsView> {
  received: GetUploadRowErrorsQuery | null = null;

  constructor(private readonly result: Either<Error, RowErrorsView>) {}

  async execute(query: GetUploadRowErrorsQuery): Promise<Either<Error, RowErrorsView>> {
    this.received = query;
    return this.result;
  }
}

const VIEW: RowErrorsView = { data: [{ line: 3, message: "La categoría no puede estar vacía" }] };

describe("GetUploadRowErrorsController", () => {
  it("arma la query con el id de la ruta y responde 200 con los errores", async () => {
    const handler = new HandlerDouble(Either.right(VIEW));

    const response = await new GetUploadRowErrorsController(handler).handle({ params: { id: "abc" }, query: {}, body: undefined, headers: {} });

    expect(handler.received).toEqual(new GetUploadRowErrorsQuery("abc"));
    expect(response).toEqual({ statusCode: 200, body: VIEW });
  });

  it("un Left lanza el error para el manejador central (404)", async () => {
    const error = new NotFoundError("No existe");
    const controller = new GetUploadRowErrorsController(new HandlerDouble(Either.left(error)));

    await expect(controller.handle({ params: {}, query: {}, body: undefined, headers: {} })).rejects.toBe(error);
  });
});
