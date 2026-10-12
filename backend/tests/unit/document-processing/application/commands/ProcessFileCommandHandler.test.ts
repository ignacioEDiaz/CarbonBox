import {
  FAILED_AFTER_RETRIES_MESSAGE,
  ProcessFileCommandHandler,
} from "../../../../../src/document-processing/application/commands/handlers/ProcessFileCommandHandler";
import { ProcessFileCommand } from "../../../../../src/document-processing/application/commands/objects/ProcessFileCommand";
import {
  IFileProcessingService,
  ProcessingSummary,
} from "../../../../../src/document-processing/application/services/IFileProcessingService";
import { Upload } from "../../../../../src/document-processing/domain/entities/Upload";
import { Either } from "../../../../../src/shared/domain/Either";
import { NotFoundError, ValidationError } from "../../../../../src/shared/domain/errors";
import { InMemoryUploadRepository } from "../../../../support/InMemoryUploadRepository";
import { pendingUpload } from "../../../../support/uploadFixtures";

// Doble del servicio: devuelve el resultado indicado o lanza, y anota el estado del upload que recibió
class FileProcessingServiceDouble implements IFileProcessingService {
  receivedStatus: string | null = null;

  constructor(private readonly outcome: Either<ValidationError, ProcessingSummary> | Error) {}

  async process(upload: Upload): Promise<Either<ValidationError, ProcessingSummary>> {
    this.receivedStatus = upload.status.value;
    if (this.outcome instanceof Error) throw this.outcome;
    return this.outcome;
  }
}

async function setup(outcome: Either<ValidationError, ProcessingSummary> | Error) {
  const uploadRepository = new InMemoryUploadRepository();
  const service = new FileProcessingServiceDouble(outcome);
  const upload = pendingUpload();
  await uploadRepository.save(upload);
  return { handler: new ProcessFileCommandHandler(uploadRepository, service), uploadRepository, service, upload };
}

async function savedStatus(repository: InMemoryUploadRepository, id: string) {
  const upload = await repository.findById(id);
  return { status: upload?.status.value, errorMessage: upload?.errorMessage, counts: [upload?.totalRows, upload?.processedRows, upload?.failedRows] };
}

describe("ProcessFileCommandHandler", () => {
  it("marca PROCESSING antes de procesar y COMPLETED con los conteos", async () => {
    const { handler, uploadRepository, service, upload } = await setup(
      Either.right({ totalRows: 3, processedRows: 2, failedRows: 1 }),
    );

    const result = await handler.execute(new ProcessFileCommand(upload.id, 1));

    expect(service.receivedStatus).toBe("PROCESSING");
    expect(result.isRight() && result.value).toBe("COMPLETED");
    expect(await savedStatus(uploadRepository, upload.id)).toEqual({ status: "COMPLETED", errorMessage: null, counts: [3, 2, 1] });
  });

  it("marca FAILED si ninguna fila es válida", async () => {
    const { handler, uploadRepository, upload } = await setup(Either.right({ totalRows: 4, processedRows: 0, failedRows: 4 }));

    await handler.execute(new ProcessFileCommand(upload.id, 1));

    expect((await savedStatus(uploadRepository, upload.id)).errorMessage).toBe(
      "Ninguna de las 4 filas es válida: revisá los errores por fila",
    );
  });

  it("marca FAILED con el motivo del parser si el archivo entero es inválido", async () => {
    const { handler, uploadRepository, upload } = await setup(Either.left(new ValidationError("El archivo no es texto UTF-8 válido")));

    const result = await handler.execute(new ProcessFileCommand(upload.id, 1));

    expect(result.isRight() && result.value).toBe("FAILED");
    expect((await savedStatus(uploadRepository, upload.id)).errorMessage).toBe("El archivo no es texto UTF-8 válido");
  });

  it("devuelve NotFoundError si el upload no existe", async () => {
    const { handler } = await setup(Either.right({ totalRows: 1, processedRows: 1, failedRows: 0 }));

    const result = await handler.execute(new ProcessFileCommand("no-existe", 1));

    expect(result.isLeft() && result.value).toBeInstanceOf(NotFoundError);
  });

  it("no procesa un upload que ya terminó (entrega duplicada)", async () => {
    const { handler, service, upload } = await setup(Either.right({ totalRows: 1, processedRows: 1, failedRows: 0 }));
    await handler.execute(new ProcessFileCommand(upload.id, 1));
    service.receivedStatus = null;

    const result = await handler.execute(new ProcessFileCommand(upload.id, 1));

    expect(result.isRight() && result.value).toBe("COMPLETED");
    expect(service.receivedStatus).toBeNull();
  });

  it.each([1, 2])("en el intento %i deja salir una falla transitoria y el upload queda PROCESSING", async (attempt) => {
    const { handler, uploadRepository, upload } = await setup(new Error("S3 no responde"));

    await expect(handler.execute(new ProcessFileCommand(upload.id, attempt))).rejects.toThrow("S3 no responde");
    expect((await savedStatus(uploadRepository, upload.id)).status).toBe("PROCESSING");
  });

  it("en el tercer intento marca FAILED en lugar de dejar salir la falla", async () => {
    const { handler, uploadRepository, upload } = await setup(new Error("S3 no responde"));

    const result = await handler.execute(new ProcessFileCommand(upload.id, 3));

    expect(result.isRight() && result.value).toBe("FAILED");
    expect((await savedStatus(uploadRepository, upload.id)).errorMessage).toBe(FAILED_AFTER_RETRIES_MESSAGE);
  });
});
