import { GetUploadByIdQueryHandler } from "../../../../../src/document-processing/application/queries/handlers/GetUploadByIdQueryHandler";
import { GetUploadByIdQuery } from "../../../../../src/document-processing/application/queries/objects/GetUploadByIdQuery";
import { Upload } from "../../../../../src/document-processing/domain/entities/Upload";
import { FileName } from "../../../../../src/document-processing/domain/value-objects/FileName";
import { NotFoundError } from "../../../../../src/shared/domain/errors";
import { InMemoryUploadRepository } from "../../../../support/InMemoryUploadRepository";

async function savedUpload(repository: InMemoryUploadRepository, change?: (upload: Upload) => void): Promise<Upload> {
  const fileName = FileName.create("datos.csv");
  if (fileName.isLeft()) throw fileName.value;
  const created = Upload.create({ fileName: fileName.value, fileUrl: "uploads/x.csv", userId: "user-123" });
  if (created.isLeft()) throw created.value;
  change?.(created.value);
  await repository.save(created.value);
  return created.value;
}

describe("GetUploadByIdQueryHandler", () => {
  it("devuelve la vista del upload, con fechas ISO y sin la ubicación del archivo ni el usuario", async () => {
    const repository = new InMemoryUploadRepository();
    const upload = await savedUpload(repository);

    const result = await new GetUploadByIdQueryHandler(repository).execute(new GetUploadByIdQuery(upload.id));

    expect(result.isRight() && result.value).toEqual({
      id: upload.id,
      status: "PENDING",
      fileName: "datos.csv",
      totalRows: null,
      processedRows: null,
      failedRows: null,
      errorMessage: null,
      createdAt: upload.createdAt.toISOString(),
      updatedAt: upload.updatedAt.toISOString(),
    });
  });

  it("un upload completado trae sus conteos", async () => {
    const repository = new InMemoryUploadRepository();
    const upload = await savedUpload(repository, (u) => {
      u.markAsProcessing();
      u.markAsCompleted({ totalRows: 10, processedRows: 8, failedRows: 2 });
    });

    const result = await new GetUploadByIdQueryHandler(repository).execute(new GetUploadByIdQuery(upload.id));

    expect(result.isRight() && [result.value.status, result.value.totalRows, result.value.processedRows]).toEqual([
      "COMPLETED",
      10,
      8,
    ]);
  });

  it("un upload fallido trae su mensaje de error", async () => {
    const repository = new InMemoryUploadRepository();
    const upload = await savedUpload(repository, (u) => {
      u.markAsProcessing();
      u.markAsFailed("archivo ilegible");
    });

    const result = await new GetUploadByIdQueryHandler(repository).execute(new GetUploadByIdQuery(upload.id));

    expect(result.isRight() && result.value.errorMessage).toBe("archivo ilegible");
  });

  it("un id que no existe devuelve NotFoundError", async () => {
    const result = await new GetUploadByIdQueryHandler(new InMemoryUploadRepository()).execute(
      new GetUploadByIdQuery("no-existe"),
    );

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(NotFoundError);
    expect(result.isLeft() && result.value.message).toBe("No existe un upload con id no-existe");
  });
});
