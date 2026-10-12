import { IActivityDataRepository } from "../../../src/document-processing/domain/repositories/IActivityDataRepository";
import { IRowErrorRepository } from "../../../src/document-processing/domain/repositories/IRowErrorRepository";
import { IUploadRepository } from "../../../src/document-processing/domain/repositories/IUploadRepository";
import { App } from "../../../src/main/App";
import { buildContainer } from "../../../src/main/container";
import { FileProcessingWorker } from "../../../src/workers/FileProcessingWorker";
import { authHeader } from "../../support/authHeader";
import { multipartBody } from "../../support/multipart";
import { testConfig } from "../../support/testConfig";
import { createTestAwsClients, createTestQueue, testBucket } from "../testAws";

const { sqsClient } = createTestAwsClients();
let queue: Awaited<ReturnType<typeof createTestQueue>>;
let app: App;
let container: ReturnType<typeof buildContainer>;

beforeAll(async () => {
  queue = await createTestQueue(sqsClient);
  // El contenedor real que comparten la API y el worker: base de tests, bucket de test y cola propia
  container = buildContainer(
    testConfig({
      database: { url: process.env.TEST_DATABASE_URL },
      aws: { region: process.env.AWS_REGION, endpoint: process.env.AWS_ENDPOINT_URL },
      storage: { bucket: testBucket() },
      queue: { url: queue.queueUrl },
    }),
  );
  app = new App(container, { logger: false });
});

afterAll(async () => {
  await app.server.close();
  await queue.deleteQueue();
  sqsClient.destroy();
});

async function upload(csv: string): Promise<string> {
  const response = await app.server.inject({
    method: "POST",
    url: "/api/v1/uploads",
    ...(await authenticatedMultipart(csv)),
  });
  return response.json().id;
}

describe("procesamiento de punta a punta (API + worker, base de tests y LocalStack)", () => {
  it("una subida procesada por el worker queda COMPLETED con filas y errores en Postgres", async () => {
    const id = await upload("category,amount,unit,date\nElectricidad,120.5,kWh,2024-03-01\n,10,kWh,2024-03-02\n");

    const outcome = await container.resolve<FileProcessingWorker>("fileProcessingWorker").processNextMessage();

    expect(outcome).toBe("processed");
    const saved = await container.resolve<IUploadRepository>("uploadRepository").findById(id);
    expect([saved?.status.value, saved?.totalRows, saved?.processedRows, saved?.failedRows]).toEqual(["COMPLETED", 2, 1, 1]);
    const rows = await container.resolve<IActivityDataRepository>("activityDataRepository").findByUploadId(id);
    expect(rows.map((row) => [row.category, row.amount])).toEqual([["Electricidad", 120.5]]);
    expect(await container.resolve<IRowErrorRepository>("rowErrorRepository").findByUploadId(id)).toEqual([
      { line: 3, message: "La categoría no puede estar vacía" },
    ]);
    // El mensaje se borró: la cola quedó vacía
    await expect(container.resolve<FileProcessingWorker>("fileProcessingWorker").processNextMessage()).resolves.toBe("empty");
  });

  it("un CSV sin filas válidas queda FAILED con su motivo", async () => {
    const id = await upload("category,amount,unit,date\n,10,kWh,2024-03-02\n");

    await container.resolve<FileProcessingWorker>("fileProcessingWorker").processNextMessage();

    const saved = await container.resolve<IUploadRepository>("uploadRepository").findById(id);
    expect([saved?.status.value, saved?.errorMessage]).toEqual([
      "FAILED",
      "Ninguna de las 1 filas es válida: revisá los errores por fila",
    ]);
  });
});

// El cuerpo multipart con el header de una sesión válida
async function authenticatedMultipart(content: string) {
  const body = await multipartBody({ fileName: "datos.csv", content });
  return { payload: body.payload, headers: { ...body.headers, ...authHeader() } };
}
