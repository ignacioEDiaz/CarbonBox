import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../../../../../src/shared/domain/errors";
import { toHttpError } from "../../../../../src/shared/infrastructure/http/errorHandler";

describe("toHttpError", () => {
  it("un UnauthorizedError es 401 UNAUTHORIZED con su mensaje", () => {
    expect(toHttpError(new UnauthorizedError("Falta iniciar sesión"))).toEqual({
      statusCode: 401,
      body: { error: { type: "UNAUTHORIZED", message: "Falta iniciar sesión" } },
    });
  });

  it("un ConflictError es 409 CONFLICT con su mensaje", () => {
    expect(toHttpError(new ConflictError("Ya existe"))).toEqual({
      statusCode: 409,
      body: { error: { type: "CONFLICT", message: "Ya existe" } },
    });
  });

  it("un ValidationError es 400 VALIDATION_ERROR con su mensaje", () => {
    expect(toHttpError(new ValidationError("x"))).toEqual({
      statusCode: 400,
      body: { error: { type: "VALIDATION_ERROR", message: "x" } },
    });
  });

  it("un NotFoundError es 404 NOT_FOUND con su mensaje", () => {
    expect(toHttpError(new NotFoundError("x"))).toEqual({
      statusCode: 404,
      body: { error: { type: "NOT_FOUND", message: "x" } },
    });
  });

  it("un error 4xx de Fastify conserva su código como VALIDATION_ERROR", () => {
    const fastifyError = Object.assign(new Error("Unsupported Media Type"), { statusCode: 415 });

    expect(toHttpError(fastifyError)).toEqual({
      statusCode: 415,
      body: { error: { type: "VALIDATION_ERROR", message: "Unsupported Media Type" } },
    });
  });

  it("cualquier otro error es 500 sin exponer el detalle", () => {
    const response = toHttpError(new Error("detalle secreto"));

    expect(response).toEqual({
      statusCode: 500,
      body: { error: { type: "INTERNAL_ERROR", message: "Error interno del servidor" } },
    });
    expect(JSON.stringify(response)).not.toContain("detalle secreto");
  });
});
