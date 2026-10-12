export class GetUploadRowErrorsQuery {
  constructor(
    readonly uploadId: string,
    readonly userId: string, // quien pregunta: un upload ajeno responde "no encontrado"
  ) {}
}
