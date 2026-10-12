import { UnauthorizedError } from "../../domain/errors";
import { IHttpRequest } from "./IHttpRequest";

// El usuario que dejó adaptAuthenticatedRoute. Si un controller protegido se conectara por error
// con adaptRoute, no habría usuario: se lanza 401 en vez de seguir sin saber de quién es el pedido.
export function readUserId(request: IHttpRequest): string {
  if (request.userId === null || request.userId === undefined) {
    throw new UnauthorizedError("Iniciá sesión: falta el token o venció");
  }
  return request.userId;
}
