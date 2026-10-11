export type UploadedFile = {
  fileName: string;
  content: Buffer;
};

// Solo datos: lo que llegó en la petición, sin validar. Validar es trabajo del handler.
export class CreateUploadCommand {
  constructor(
    readonly file: UploadedFile | null, // null si la petición no trajo archivo
    readonly userId: string,
    readonly idempotencyKey: string | null = null, // header Idempotency-Key, si vino
  ) {}
}
