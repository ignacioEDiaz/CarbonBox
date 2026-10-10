import { App } from "../../src/main/App";
import { buildContainer } from "../../src/main/container";
import { Either } from "../../src/shared/domain/Either";
import { ValidationError } from "../../src/shared/domain/errors";
import { adaptRoute } from "../../src/shared/infrastructure/http/adaptRoute";
import { BaseController } from "../../src/shared/infrastructure/http/BaseController";
import { IHttpResponse } from "../../src/shared/infrastructure/http/IHttpResponse";

// Controller de prueba cuyo handler "devolvió" un error de validación
class FailingController extends BaseController {
  async handle(): Promise<IHttpResponse> {
    return this.respond(Either.left(new ValidationError("dato inválido")));
  }
}

let app: App;

beforeEach(() => {
  const container = buildContainer({ port: 0, database: { url: "postgresql://u:p@localhost:1/db" } });
  app = new App(container, { logger: false });
});

afterEach(async () => {
  await app.server.close();
});

describe("formato de errores HTTP", () => {
  it("una ruta inexistente responde 404 NOT_FOUND", async () => {
    const response = await app.server.inject({ method: "GET", url: "/no-existe" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { type: "NOT_FOUND", message: "Ruta GET /no-existe no encontrada" },
    });
  });

  it("un error inesperado responde 500 sin el detalle interno", async () => {
    app.server.get("/explota", async () => {
      throw new Error("detalle secreto");
    });

    const response = await app.server.inject({ method: "GET", url: "/explota" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { type: "INTERNAL_ERROR", message: "Error interno del servidor" },
    });
    expect(response.body).not.toContain("detalle secreto");
  });

  it("un Left de un controller llega al cliente como 400 VALIDATION_ERROR", async () => {
    app.server.get("/invalido", adaptRoute(new FailingController()));

    const response = await app.server.inject({ method: "GET", url: "/invalido" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: { type: "VALIDATION_ERROR", message: "dato inválido" } });
  });
});
