// Respuesta independiente de Fastify; adaptRoute la traduce a reply.status().send()
export interface IHttpResponse {
  statusCode: number;
  body: unknown;
}
