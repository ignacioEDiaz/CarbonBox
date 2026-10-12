import { ProcessFileCommand } from "../../../src/document-processing/application/commands/objects/ProcessFileCommand";
import { UploadStatusValue } from "../../../src/document-processing/domain/value-objects/UploadStatus";
import { ICommandHandler } from "../../../src/shared/application/ICommandHandler";
import { Either } from "../../../src/shared/domain/Either";
import { NotFoundError } from "../../../src/shared/domain/errors";
import { FileProcessingWorker } from "../../../src/workers/FileProcessingWorker";
import { InMemoryMessageQueue } from "../../support/InMemoryMessageQueue";

// Doble del handler: anota los commands y devuelve (o lanza) lo indicado
class HandlerDouble implements ICommandHandler<ProcessFileCommand, UploadStatusValue> {
  readonly received: ProcessFileCommand[] = [];

  constructor(private readonly outcome: Either<Error, UploadStatusValue> | Error) {}

  async execute(command: ProcessFileCommand): Promise<Either<Error, UploadStatusValue>> {
    this.received.push(command);
    if (this.outcome instanceof Error) throw this.outcome;
    return this.outcome;
  }
}

function setup(outcome: Either<Error, UploadStatusValue> | Error) {
  const queue = new InMemoryMessageQueue();
  const handler = new HandlerDouble(outcome);
  return { queue, handler, worker: new FileProcessingWorker(queue, handler) };
}

describe("FileProcessingWorker", () => {
  it("con la cola vacía devuelve empty", async () => {
    const { worker } = setup(Either.right("COMPLETED"));

    await expect(worker.processNextMessage()).resolves.toBe("empty");
  });

  it("traduce el mensaje a un ProcessFileCommand y lo borra al terminar", async () => {
    const { queue, handler, worker } = setup(Either.right("COMPLETED"));
    await queue.publish({ uploadId: "8b0e5c0e" });

    await expect(worker.processNextMessage()).resolves.toBe("processed");

    expect(handler.received).toEqual([new ProcessFileCommand("8b0e5c0e", 1)]);
    expect(queue.messages).toEqual([]);
  });

  it("un Left del handler (upload inexistente) también borra el mensaje: reintentar daría lo mismo", async () => {
    const { queue, worker } = setup(Either.left(new NotFoundError("No existe")));
    await queue.publish({ uploadId: "no-existe" });

    await worker.processNextMessage();

    expect(queue.messages).toEqual([]);
  });

  it.each([{ otro: "dato" }, { uploadId: 42 }])("descarta y borra un mensaje sin uploadId de texto: %p", async (body) => {
    const { queue, handler, worker } = setup(Either.right("COMPLETED"));
    await queue.publish(body);

    await expect(worker.processNextMessage()).resolves.toBe("discarded");

    expect(handler.received).toEqual([]);
    expect(queue.messages).toEqual([]);
  });

  it("si el handler lanza (falla transitoria), deja salir el error y NO borra el mensaje", async () => {
    const { queue, worker } = setup(new Error("Postgres no responde"));
    await queue.publish({ uploadId: "8b0e5c0e" });

    await expect(worker.processNextMessage()).rejects.toThrow("Postgres no responde");

    expect(queue.messages).toEqual([{ uploadId: "8b0e5c0e" }]);
  });
});
