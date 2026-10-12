import { ListUploadsQueryHandler } from "../../../../../src/document-processing/application/queries/handlers/ListUploadsQueryHandler";
import { ListUploadsQuery } from "../../../../../src/document-processing/application/queries/objects/ListUploadsQuery";
import { Upload } from "../../../../../src/document-processing/domain/entities/Upload";
import { FileName } from "../../../../../src/document-processing/domain/value-objects/FileName";
import { ValidationError } from "../../../../../src/shared/domain/errors";
import { InMemoryUploadRepository } from "../../../../support/InMemoryUploadRepository";

// count uploads de userId, con createdAt crecientes: el último es el más nuevo
async function setup(count: number, userId = "user-123") {
  const repository = new InMemoryUploadRepository();
  const ids: string[] = [];
  for (let index = 0; index < count; index++) {
    const fileName = FileName.create(`datos-${index}.csv`);
    if (fileName.isLeft()) throw fileName.value;
    const created = Upload.create({ fileName: fileName.value, fileUrl: `memory/${index}.csv`, userId });
    if (created.isLeft()) throw created.value;
    const upload = Upload.restore({ ...propsOf(created.value), createdAt: new Date(2026, 0, 1, 0, 0, index) });
    await repository.save(upload);
    ids.push(upload.id);
  }
  return { handler: new ListUploadsQueryHandler(repository), ids };
}

function propsOf(upload: Upload) {
  return {
    id: upload.id,
    fileName: upload.fileName,
    fileUrl: upload.fileUrl,
    status: upload.status,
    userId: upload.userId,
    totalRows: upload.totalRows,
    processedRows: upload.processedRows,
    failedRows: upload.failedRows,
    errorMessage: upload.errorMessage,
    idempotencyKey: upload.idempotencyKey,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
  };
}

describe("ListUploadsQueryHandler", () => {
  it("sin parámetros devuelve la página 1 de 10, del más nuevo al más viejo", async () => {
    const { handler, ids } = await setup(12);

    const result = await handler.execute(new ListUploadsQuery("user-123", undefined, undefined));

    if (result.isLeft()) throw result.value;
    expect([result.value.total, result.value.page, result.value.limit]).toEqual([12, 1, 10]);
    expect(result.value.data.map((upload) => upload.id)).toEqual([...ids].reverse().slice(0, 10));
  });

  it("la página 2 trae los que siguen, con el formato de la consulta por id", async () => {
    const { handler, ids } = await setup(12);

    const result = await handler.execute(new ListUploadsQuery("user-123", "2", "10"));

    if (result.isLeft()) throw result.value;
    expect(result.value.data.map((upload) => upload.id)).toEqual([ids[1], ids[0]]);
    expect(Object.keys(result.value.data[0]).sort()).toEqual(
      ["createdAt", "errorMessage", "failedRows", "fileName", "id", "processedRows", "status", "totalRows", "updatedAt"].sort(),
    );
  });

  it("una página más allá del final trae data vacío y el total real", async () => {
    const { handler } = await setup(3);

    const result = await handler.execute(new ListUploadsQuery("user-123", "5", "10"));

    expect(result.isRight() && [result.value.data, result.value.total]).toEqual([[], 3]);
  });

  it("no incluye uploads de otro usuario", async () => {
    const { handler } = await setup(2, "otro-usuario");

    const result = await handler.execute(new ListUploadsQuery("user-123", undefined, undefined));

    expect(result.isRight() && result.value.total).toBe(0);
  });

  it.each([
    { page: "0", limit: undefined, message: "page debe ser un entero mayor o igual a 1" },
    { page: "abc", limit: undefined, message: "page debe ser un entero mayor o igual a 1" },
    { page: "1.5", limit: undefined, message: "page debe ser un entero mayor o igual a 1" },
    { page: undefined, limit: "0", message: "limit debe ser un entero entre 1 y 100" },
    { page: undefined, limit: "101", message: "limit debe ser un entero entre 1 y 100" },
  ])("rechaza page=$page limit=$limit", async ({ page, limit, message }) => {
    const { handler } = await setup(0);

    const result = await handler.execute(new ListUploadsQuery("user-123", page, limit));

    expect(result.isLeft() && result.value).toEqual(new ValidationError(message));
  });
});
