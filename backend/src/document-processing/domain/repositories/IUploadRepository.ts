import { Upload } from "../entities/Upload";

// Lo que el dominio necesita de la persistencia de uploads. La implementación vive en infrastructure.
export interface IUploadRepository {
  // Crea el upload si no existe o lo actualiza si ya existe
  save(upload: Upload): Promise<void>;
  // null si no existe: el handler decide si eso es un NotFoundError
  findById(id: string): Promise<Upload | null>;
}
