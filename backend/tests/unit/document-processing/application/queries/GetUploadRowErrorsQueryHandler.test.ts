import { GetUploadRowErrorsQueryHandler } from "../../../../../src/document-processing/application/queries/handlers/GetUploadRowErrorsQueryHandler";
import { GetUploadRowErrorsQuery } from "../../../../../src/document-processing/application/queries/objects/GetUploadRowErrorsQuery";
import { NotFoundError } from "../../../../../src/shared/domain/errors";
import { InMemoryRowErrorRepository } from "../../../../support/InMemoryRowErrorRepository";
import { InMemoryUploadRepository } from "../../../../support/InMemoryUploadRepository";
import { pendingUpload } from "../../../../support/uploadFixtures";

async function setup() {
  const uploadRepository = new InMemoryUploadRepository();
  const rowErrorRepository = new InMemoryRowErrorRepository();
  const upload = pendingUpload();
  await uploadRepository.save(upload);
  return { handler: new GetUploadRowErrorsQueryHandler(uploadRepository, rowErrorRepository), rowErrorRepository, upload };
}

describe("GetUploadRowErrorsQueryHandler", () => {
  it("devuelve los errores del upload ordenados por línea", async () => {
    const { handler, rowErrorRepository, upload } = await setup();
    await rowErrorRepository.saveForUpload(upload.id, [
      { line: 5, message: "La unidad no puede estar vacía" },
      { line: 3, message: "La categoría no puede estar vacía" },
    ]);

    const result = await handler.execute(new GetUploadRowErrorsQuery(upload.id));

    expect(result.isRight() && result.value).toEqual({
      data: [
        { line: 3, message: "La categoría no puede estar vacía" },
        { line: 5, message: "La unidad no puede estar vacía" },
      ],
    });
  });

  it("devuelve una lista vacía si el upload no tiene errores (o todavía no se procesó)", async () => {
    const { handler, upload } = await setup();

    const result = await handler.execute(new GetUploadRowErrorsQuery(upload.id));

    expect(result.isRight() && result.value).toEqual({ data: [] });
  });

  it("devuelve NotFoundError si el upload no existe", async () => {
    const { handler } = await setup();

    const result = await handler.execute(new GetUploadRowErrorsQuery("no-existe"));

    expect(result.isLeft() && result.value).toBeInstanceOf(NotFoundError);
  });
});
