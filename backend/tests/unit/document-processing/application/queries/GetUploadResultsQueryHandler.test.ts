import { GetUploadResultsQueryHandler } from "../../../../../src/document-processing/application/queries/handlers/GetUploadResultsQueryHandler";
import { GetUploadResultsQuery } from "../../../../../src/document-processing/application/queries/objects/GetUploadResultsQuery";
import { ActivityData } from "../../../../../src/document-processing/domain/entities/ActivityData";
import { NotFoundError } from "../../../../../src/shared/domain/errors";
import { InMemoryActivityDataRepository } from "../../../../support/InMemoryActivityDataRepository";
import { InMemoryUploadRepository } from "../../../../support/InMemoryUploadRepository";
import { pendingUpload } from "../../../../support/uploadFixtures";

async function setup() {
  const uploadRepository = new InMemoryUploadRepository();
  const activityDataRepository = new InMemoryActivityDataRepository();
  const upload = pendingUpload();
  await uploadRepository.save(upload);
  return { handler: new GetUploadResultsQueryHandler(uploadRepository, activityDataRepository), activityDataRepository, upload };
}

describe("GetUploadResultsQueryHandler", () => {
  it("devuelve las filas guardadas con category, amount, unit y date", async () => {
    const { handler, activityDataRepository, upload } = await setup();
    const row = ActivityData.create({ uploadId: upload.id, category: "Gas", amount: 30, unit: "m3", date: "2024-03-03" });
    if (row.isLeft()) throw row.value;
    await activityDataRepository.saveForUpload(upload.id, [row.value]);

    const result = await handler.execute(new GetUploadResultsQuery(upload.id));

    expect(result.isRight() && result.value).toEqual({ data: [{ category: "Gas", amount: 30, unit: "m3", date: "2024-03-03" }] });
  });

  it("devuelve data vacío si el upload todavía no tiene filas", async () => {
    const { handler, upload } = await setup();

    const result = await handler.execute(new GetUploadResultsQuery(upload.id));

    expect(result.isRight() && result.value).toEqual({ data: [] });
  });

  it("devuelve NotFoundError si el upload no existe", async () => {
    const { handler } = await setup();

    const result = await handler.execute(new GetUploadResultsQuery("no-existe"));

    expect(result.isLeft() && result.value).toBeInstanceOf(NotFoundError);
  });
});
