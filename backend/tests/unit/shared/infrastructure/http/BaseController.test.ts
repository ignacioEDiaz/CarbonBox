import { Either } from "../../../../../src/shared/domain/Either";
import { BaseController } from "../../../../../src/shared/infrastructure/http/BaseController";
import { IHttpResponse } from "../../../../../src/shared/infrastructure/http/IHttpResponse";

// Subclase mínima para probar respond(), que es protected
class TestController extends BaseController {
  constructor(
    private readonly result: Either<Error, string>,
    private readonly statusCode?: number,
  ) {
    super();
  }

  async handle(): Promise<IHttpResponse> {
    return this.respond(this.result, this.statusCode);
  }
}

describe("BaseController", () => {
  it("un right se convierte en respuesta 200 con el valor como body", async () => {
    const controller = new TestController(Either.right("hola"));

    await expect(controller.handle()).resolves.toEqual({ statusCode: 200, body: "hola" });
  });

  it("permite indicar otro status code para el éxito", async () => {
    const controller = new TestController(Either.right("creado"), 201);

    await expect(controller.handle()).resolves.toEqual({ statusCode: 201, body: "creado" });
  });

  it("un left lanza el error para que lo tome el manejador central", async () => {
    const error = new Error("falló");
    const controller = new TestController(Either.left(error));

    await expect(controller.handle()).rejects.toBe(error);
  });
});
