import { CsvParserService } from "../../../../../src/document-processing/application/services/CsvParserService";
import { FileProcessingService } from "../../../../../src/document-processing/application/services/FileProcessingService";
import { InMemoryActivityDataRepository } from "../../../../support/InMemoryActivityDataRepository";
import { InMemoryFileStorage } from "../../../../support/InMemoryFileStorage";
import { InMemoryRowErrorRepository } from "../../../../support/InMemoryRowErrorRepository";
import { pendingUpload } from "../../../../support/uploadFixtures";

const HEADER = "category,amount,unit,date";

async function setup(csv: string) {
  const fileStorage = new InMemoryFileStorage();
  const activityDataRepository = new InMemoryActivityDataRepository();
  const rowErrorRepository = new InMemoryRowErrorRepository();
  const service = new FileProcessingService(
    fileStorage,
    new CsvParserService(),
    activityDataRepository,
    rowErrorRepository,
  );
  const upload = pendingUpload(await fileStorage.save(Buffer.from(csv)));
  return { service, upload, activityDataRepository, rowErrorRepository };
}

describe("FileProcessingService", () => {
  it("lee el archivo, guarda filas válidas y errores, y devuelve los conteos", async () => {
    const { service, upload, activityDataRepository, rowErrorRepository } = await setup(
      `${HEADER}\nElectricidad,120.5,kWh,2024-03-01\n,10,kWh,2024-03-02\nGas,30,m3,2024-03-03\n`,
    );

    const result = await service.process(upload);

    expect(result.isRight() && result.value).toEqual({ totalRows: 3, processedRows: 2, failedRows: 1 });
    expect((await activityDataRepository.findByUploadId(upload.id)).map((row) => row.category)).toEqual([
      "Electricidad",
      "Gas",
    ]);
    expect(await rowErrorRepository.findByUploadId(upload.id)).toEqual([
      { line: 3, message: "La categoría no puede estar vacía" },
    ]);
  });

  it("si el parser rechaza el archivo, devuelve su motivo y no guarda nada", async () => {
    const { service, upload, activityDataRepository, rowErrorRepository } = await setup("a;b;c;d\n1;2;3;4\n");

    const result = await service.process(upload);

    expect(result.isLeft() && result.value.message).toContain("El encabezado debe ser");
    expect(activityDataRepository.rowsByUpload.size).toBe(0);
    expect(rowErrorRepository.errorsByUpload.size).toBe(0);
  });

  it("si el archivo no se puede leer, deja salir la excepción (falla transitoria)", async () => {
    const { service } = await setup(`${HEADER}\n`);

    await expect(service.process(pendingUpload("memory/no-existe.csv"))).rejects.toThrow();
  });
});
