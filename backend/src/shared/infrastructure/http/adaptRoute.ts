import { FastifyReply, FastifyRequest } from "fastify";
import { BaseController } from "./BaseController";
import { IHttpFile } from "./IHttpRequest";

// Único punto que conoce a Fastify y a los controllers a la vez.
// Sin try/catch: si el controller lanza, el error llega al manejador central de Fastify.
export function adaptRoute(controller: BaseController) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const response = await controller.handle({
      params: request.params,
      query: request.query,
      body: request.body,
      headers: request.headers,
      file: await readFile(request),
    });
    return reply.status(response.statusCode).send(response.body);
  };
}

// Si la petición es multipart, toma el primer archivo. Si supera el tamaño máximo, toBuffer()
// lanza un error 413 que traduce el manejador central.
async function readFile(request: FastifyRequest): Promise<IHttpFile | undefined> {
  if (!request.isMultipart()) {
    return undefined;
  }
  const part = await request.file();
  if (part === undefined) {
    return undefined;
  }
  return { fileName: part.filename, content: await part.toBuffer() };
}
