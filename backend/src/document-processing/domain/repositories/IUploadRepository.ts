import { Upload } from "../entities/Upload";

// Lo que el dominio necesita de la persistencia de uploads. La implementación vive en infrastructure.
export interface IUploadRepository {
  // Crea el upload si no existe o lo actualiza si ya existe. Si otro upload ya usa su clave de
  // idempotencia, lanza DuplicateIdempotencyKeyError
  save(upload: Upload): Promise<void>;
  // null si no existe: el handler decide si eso es un NotFoundError
  findById(id: string): Promise<Upload | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<Upload | null>;
}
