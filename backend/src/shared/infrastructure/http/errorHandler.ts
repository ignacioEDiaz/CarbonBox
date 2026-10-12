import { FastifyInstance } from "fastify";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../../domain/errors";
import { IHttpResponse } from "./IHttpResponse";

type ErrorType = "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";

function errorResponse(statusCode: number, type: ErrorType, message: string): IHttpResponse {
  return { statusCode, body: { error: { type, message } } };
}

// Errores propios de Fastify (JSON mal formado, content-type no soportado...) traen un statusCode 4xx
function isClientError(error: unknown): error is Error & { statusCode: number } {
  return (
    error instanceof Error &&
    "statusCode" in error &&
    typeof error.statusCode === "number" &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  );
}

// Único lugar que decide cómo se ve un error para el cliente
export function toHttpError(error: unknown): IHttpResponse {
  if (error instanceof ValidationError) return errorResponse(400, "VALIDATION_ERROR", error.message);
  if (error instanceof UnauthorizedError) return errorResponse(401, "UNAUTHORIZED", error.message);
  if (error instanceof NotFoundError) return errorResponse(404, "NOT_FOUND", error.message);
  if (error instanceof ConflictError) return errorResponse(409, "CONFLICT", error.message);
  if (isClientError(error)) return errorResponse(error.statusCode, "VALIDATION_ERROR", error.message);
  // Lo inesperado no se describe al cliente: el detalle queda en el log
  return errorResponse(500, "INTERNAL_ERROR", "Error interno del servidor");
}

export function registerErrorHandlers(server: FastifyInstance): void {
  server.setErrorHandler((error, request, reply) => {
    const response = toHttpError(error);
    if (response.statusCode === 500) {
      request.log.error(error);
    }
    return reply.status(response.statusCode).send(response.body);
  });

  server.setNotFoundHandler((request, reply) => {
    const response = errorResponse(404, "NOT_FOUND", `Ruta ${request.method} ${request.url} no encontrada`);
    return reply.status(response.statusCode).send(response.body);
  });
}
