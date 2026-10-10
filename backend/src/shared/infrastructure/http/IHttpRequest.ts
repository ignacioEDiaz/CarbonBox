// Request independiente de Fastify. Los campos son unknown: cada controller valida lo que usa.
export interface IHttpRequest {
  params: unknown;
  query: unknown;
  body: unknown;
}
