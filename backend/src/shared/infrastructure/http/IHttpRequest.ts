export interface IHttpFile {
  fileName: string;
  content: Buffer;
}

// Request independiente de Fastify. Los campos son unknown: cada controller valida lo que usa.
export interface IHttpRequest {
  params: unknown;
  query: unknown;
  body: unknown;
  headers: unknown;
  file?: IHttpFile; // presente solo si la petición es multipart y trajo un archivo
  userId?: string | null; // el usuario del token, en las rutas protegidas (adaptAuthenticatedRoute)
}
