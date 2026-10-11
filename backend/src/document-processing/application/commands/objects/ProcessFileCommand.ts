// Procesar el archivo de un upload. attempt sale del contador de entregas de la cola: con él,
// el handler sabe si es el último intento.
export class ProcessFileCommand {
  constructor(
    readonly uploadId: string,
    readonly attempt: number,
  ) {}
}
