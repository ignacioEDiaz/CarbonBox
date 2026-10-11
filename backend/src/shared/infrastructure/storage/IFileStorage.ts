// Dónde se guardan los archivos subidos. La implementación es S3 (LocalStack en local).
export interface IFileStorage {
  // Guarda el contenido sin modificarlo y devuelve su ubicación, un texto opaco
  save(content: Buffer): Promise<string>;
  // Devuelve exactamente los bytes guardados; lanza si la ubicación no existe
  read(location: string): Promise<Buffer>;
}
