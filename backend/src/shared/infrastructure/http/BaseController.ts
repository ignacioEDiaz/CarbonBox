import { Either } from "../../domain/Either";
import { IHttpRequest } from "./IHttpRequest";
import { IHttpResponse } from "./IHttpResponse";

export abstract class BaseController {
  abstract handle(request: IHttpRequest): Promise<IHttpResponse>;

  // Traduce el resultado del handler: un éxito se responde, un error se lanza
  // para que lo convierta el manejador central (sin try/catch en los controllers).
  protected respond<T>(result: Either<Error, T>, statusCode = 200): IHttpResponse {
    if (result.isLeft()) {
      throw result.value;
    }
    return { statusCode, body: result.value };
  }
}
