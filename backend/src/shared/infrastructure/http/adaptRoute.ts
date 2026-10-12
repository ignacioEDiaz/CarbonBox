import { FastifyReply, FastifyRequest } from "fastify";
import { ITokenService } from "../../application/security/ITokenService";
import { UnauthorizedError } from "../../domain/errors";
import { BaseController } from "./BaseController";
import { IHttpFile } from "./IHttpRequest";

// Único punto que conoce a Fastify y a los controllers a la vez.
// Sin try/catch: si el controller lanza, el error llega al manejador central de Fastify.
export function adaptRoute(controller: BaseController) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return send(controller, request, reply, null);
  };
}

// Igual que adaptRoute, pero exige un token válido en "Authorization: Bearer <token>" y le pasa
// al controller el usuario del token. Sin token válido lanza 401 y el controller ni se ejecuta.
export function adaptAuthenticatedRoute(controller: BaseController, tokenService: ITokenService) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const userId = tokenService.verify(readBearerToken(request.headers.authorization));
    if (userId === null) {
      throw new UnauthorizedError("Iniciá sesión: falta el token o venció");
    }
    return send(controller, request, reply, userId);
  };
}

async function send(
  controller: BaseController,
  request: FastifyRequest,
  reply: FastifyReply,
  userId: string | null,
): Promise<FastifyReply> {
  const response = await controller.handle({
    params: request.params,
    query: request.query,
    body: request.body,
    headers: request.headers,
    file: await readFile(request),
    userId,
  });
  return reply.status(response.statusCode).send(response.body);
}

function readBearerToken(header: string | undefined): string {
  const prefix = "Bearer ";
  return header?.startsWith(prefix) ? header.slice(prefix.length) : "";
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
