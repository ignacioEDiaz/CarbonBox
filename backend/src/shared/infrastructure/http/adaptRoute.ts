import { FastifyReply, FastifyRequest } from "fastify";
import { BaseController } from "./BaseController";

// Único punto que conoce a Fastify y a los controllers a la vez.
// Sin try/catch: si el controller lanza, el error llega al manejador central de Fastify.
export function adaptRoute(controller: BaseController) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const response = await controller.handle({
      params: request.params,
      query: request.query,
      body: request.body,
    });
    return reply.status(response.statusCode).send(response.body);
  };
}
