import { CreateUploadCommandHandler } from "../../../../../src/document-processing/application/commands/handlers/CreateUploadCommandHandler";
import { CreateUploadCommand } from "../../../../../src/document-processing/application/commands/objects/CreateUploadCommand";
import { Upload } from "../../../../../src/document-processing/domain/entities/Upload";
import { FileName } from "../../../../../src/document-processing/domain/value-objects/FileName";
import { IdempotencyKey } from "../../../../../src/document-processing/domain/value-objects/IdempotencyKey";
import { UploadStatus } from "../../../../../src/document-processing/domain/value-objects/UploadStatus";
import { DuplicateIdempotencyKeyError, ValidationError } from "../../../../../src/shared/domain/errors";
import { IMessagePublisher } from "../../../../../src/shared/infrastructure/messaging/IMessagePublisher";
import { CallLog } from "../../../../support/CallLog";
import { FailingMessagePublisher } from "../../../../support/FailingMessagePublisher";
import { InMemoryFileStorage } from "../../../../support/InMemoryFileStorage";
import { InMemoryMessageQueue } from "../../../../support/InMemoryMessageQueue";
import { InMemoryUploadRepository } from "../../../../support/InMemoryUploadRepository";

const VALID_CSV = "category,amount,unit,date\nElectricity,150.5,kWh,2024-01-15\n";

function setup(publisher?: IMessagePublisher) {
  const log = new CallLog();
  const storage = new InMemoryFileStorage(log);
  const repository = new InMemoryUploadRepository(log);
  const queue = new InMemoryMessageQueue(log);
  const handler = new CreateUploadCommandHandler(storage, repository, publisher ?? queue);
  return { log, storage, repository, queue, handler };
}

function commandFor(fileName: string, content: string | Buffer): CreateUploadCommand {
  return new CreateUploadCommand({ fileName, content: Buffer.from(content) }, "user-123");
}

describe("CreateUploadCommandHandler: subida aceptada", () => {
  it("responde el comprobante del upload en PENDING", async () => {
    const { handler } = setup();

    const result = await handler.execute(commandFor("datos.csv", VALID_CSV));

    expect(result.isRight()).toBe(true);
    if (result.isLeft()) return;
    expect(result.value).toEqual({
      id: expect.any(String),
      status: "PENDING",
      fileName: "datos.csv",
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  it("guarda el archivo intacto, el upload PENDING que apunta a él y un mensaje con solo su id", async () => {
    const { handler, storage, repository, queue } = setup();

    const result = await handler.execute(commandFor("datos.csv", VALID_CSV));

    if (result.isLeft()) throw result.value;
    const [upload] = repository.all;
    expect(repository.all).toHaveLength(1);
    expect(upload.id).toBe(result.value.id);
    expect(upload.status.equals(UploadStatus.PENDING)).toBe(true);
    expect(upload.userId).toBe("user-123");
    expect(storage.files.get(upload.fileUrl)?.toString()).toBe(VALID_CSV);
    expect(queue.messages).toEqual([{ uploadId: upload.id }]);
  });

  it("guarda el archivo, después el upload y recién al final publica", async () => {
    const { handler, log } = setup();

    await handler.execute(commandFor("datos.csv", VALID_CSV));

    expect(log.calls).toEqual(["storage.save", "repository.save", "queue.publish"]);
  });

  it("acepta un encabezado con BOM, mayúsculas y salto de línea de Windows", async () => {
    const { handler } = setup();

    const result = await handler.execute(commandFor("datos.csv", "﻿Category,Amount,Unit,Date\r\n"));

    expect(result.isRight()).toBe(true);
  });

  it("dos subidas de datos.csv crean dos uploads con archivos distintos", async () => {
    const { handler, repository, storage } = setup();

    await handler.execute(commandFor("datos.csv", VALID_CSV));
    await handler.execute(commandFor("datos.csv", VALID_CSV));

    expect(repository.all).toHaveLength(2);
    expect(storage.files.size).toBe(2);
  });
});

describe("CreateUploadCommandHandler: subida rechazada", () => {
  it.each([
    { label: "sin archivo", command: new CreateUploadCommand(null, "user-123") },
    { label: "extensión .txt", command: commandFor("datos.txt", VALID_CSV) },
    { label: "archivo vacío", command: commandFor("datos.csv", "") },
    { label: "encabezado incorrecto", command: commandFor("datos.csv", "fecha,monto\n2024-01-15,10\n") },
  ])("$label: devuelve un error de validación y no guarda ni publica nada", async ({ command }) => {
    const { handler, log } = setup();

    const result = await handler.execute(command);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ValidationError);
    expect(log.calls).toEqual([]);
  });

  it("explica qué falta cuando no hay archivo", async () => {
    const { handler } = setup();

    const result = await handler.execute(new CreateUploadCommand(null, "user-123"));

    expect(result.isLeft() && result.value.message).toBe('Falta el archivo: enviá un CSV en el campo "file"');
  });
});

describe("CreateUploadCommandHandler: la cola no responde", () => {
  it("relanza el error de la cola y deja el upload en FAILED", async () => {
    const publisher = new FailingMessagePublisher();
    const { handler, repository } = setup(publisher);

    await expect(handler.execute(commandFor("datos.csv", VALID_CSV))).rejects.toBe(publisher.error);

    const [upload] = repository.all;
    expect(upload.status.equals(UploadStatus.FAILED)).toBe(true);
    expect(upload.errorMessage).toBe("No se pudo encolar el archivo para procesarlo");
  });
});

// Simula la carrera: dos envíos con la misma clave buscan a la vez, ninguno encuentra y el
// segundo choca con el índice único al guardar
function uploadWithKey(rawKey: string): Upload {
  const fileName = FileName.create("datos.csv");
  const key = IdempotencyKey.create(rawKey);
  if (fileName.isLeft()) throw fileName.value;
  if (key.isLeft()) throw key.value;
  const upload = Upload.create({ fileName: fileName.value, fileUrl: "memory/x.csv", userId: "user-123", idempotencyKey: key.value });
  if (upload.isLeft()) throw upload.value;
  return upload.value;
}

class RacingUploadRepository extends InMemoryUploadRepository {
  private firstLookup = true;

  async findByIdempotencyKey(idempotencyKey: string) {
    if (this.firstLookup) {
      this.firstLookup = false;
      return null; // todavía no ve al ganador
    }
    return super.findByIdempotencyKey(idempotencyKey);
  }

  async save(upload: Upload) {
    const winner = upload.idempotencyKey === null ? null : await super.findByIdempotencyKey(upload.idempotencyKey);
    if (winner !== null && winner.id !== upload.id) {
      throw new DuplicateIdempotencyKeyError("clave repetida");
    }
    return super.save(upload);
  }
}

describe("CreateUploadCommandHandler: clave de idempotencia", () => {
  const withKey = (key: string) =>
    new CreateUploadCommand({ fileName: "datos.csv", content: Buffer.from(VALID_CSV) }, "user-123", key);

  it("un reintento con la misma clave devuelve el mismo upload sin guardar ni publicar de nuevo", async () => {
    const { handler, storage, queue, repository } = setup();

    const first = await handler.execute(withKey("abc-123"));
    const retry = await handler.execute(withKey("abc-123"));

    expect(retry.isRight() && first.isRight() && retry.value).toEqual(first.isRight() && first.value);
    expect([storage.files.size, queue.messages.length, repository.all.length]).toEqual([1, 1, 1]);
  });

  it("dos subidas con claves distintas crean dos uploads", async () => {
    const { handler, repository } = setup();

    await handler.execute(withKey("a"));
    await handler.execute(withKey("b"));

    expect(repository.all).toHaveLength(2);
  });

  it("una clave inválida es un error de validación y no guarda nada", async () => {
    const { handler, log } = setup();

    const result = await handler.execute(withKey("   "));

    expect(result.value).toBeInstanceOf(ValidationError);
    expect(log.calls).toEqual([]);
  });

  it("si pierde la carrera, devuelve el upload ganador y no publica otro mensaje", async () => {
    const repository = new RacingUploadRepository();
    const winner = uploadWithKey("abc-123");
    await repository.save(winner); // el otro envío ya lo guardó
    const queue = new InMemoryMessageQueue();
    const handler = new CreateUploadCommandHandler(new InMemoryFileStorage(), repository, queue);

    const result = await handler.execute(withKey("abc-123"));

    expect(result.isRight() && result.value.id).toBe(winner.id);
    expect(repository.all).toHaveLength(1);
    expect(queue.messages).toEqual([]);
  });
});
