import { randomUUID } from "node:crypto";
import { IFileStorage } from "../../src/shared/infrastructure/storage/IFileStorage";
import { CallLog } from "./CallLog";

// Doble de IFileStorage: los archivos viven en un Map, dentro del mismo proceso
export class InMemoryFileStorage implements IFileStorage {
  readonly files = new Map<string, Buffer>();

  constructor(private readonly log = new CallLog()) {}

  async save(content: Buffer): Promise<string> {
    this.log.record("storage.save");
    const location = `memory/${randomUUID()}.csv`;
    this.files.set(location, Buffer.from(content)); // copia: si el original cambia, lo guardado no
    return location;
  }

  async read(location: string): Promise<Buffer> {
    const content = this.files.get(location);
    if (content === undefined) {
      throw new Error(`No existe el archivo ${location}`);
    }
    return content;
  }
}
