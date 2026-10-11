import { ProcessFileCommand } from "../document-processing/application/commands/objects/ProcessFileCommand";
import { UploadStatusValue } from "../document-processing/domain/value-objects/UploadStatus";
import { ICommandHandler } from "../shared/application/ICommandHandler";
import { IMessageConsumer } from "../shared/infrastructure/messaging/IMessageConsumer";

// empty: la cola estaba vacía; processed: se procesó y se borró; discarded: el mensaje no
// tenía un uploadId y se borró sin procesar
export type WorkerOutcome = "empty" | "processed" | "discarded";

// Puerta de entrada desde la cola, como un controller desde HTTP: traduce el mensaje a un
// command, llama al handler y borra el mensaje. Sin reglas de negocio ni try/catch: si el
// handler lanza (falla transitoria), el error sale y el mensaje queda para reintentarse.
export class FileProcessingWorker {
  constructor(
    private readonly messageConsumer: IMessageConsumer,
    private readonly processFileCommandHandler: ICommandHandler<ProcessFileCommand, UploadStatusValue>,
  ) {}

  async processNextMessage(): Promise<WorkerOutcome> {
    const message = await this.messageConsumer.receive();
    if (message === null) {
      return "empty";
    }
    const uploadId = readUploadId(message.body);
    if (uploadId === null) {
      // Nunca se va a poder procesar: dejarlo solo haría que vuelva una y otra vez
      await this.messageConsumer.delete(message);
      return "discarded";
    }
    // Right o Left son resultados definitivos (un Left es un error de negocio): se borra igual
    await this.processFileCommandHandler.execute(new ProcessFileCommand(uploadId, message.receiveCount));
    await this.messageConsumer.delete(message);
    return "processed";
  }
}

// body llega como unknown: lo que publica la API es { uploadId }
function readUploadId(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "uploadId" in body && typeof body.uploadId === "string") {
    return body.uploadId;
  }
  return null;
}
