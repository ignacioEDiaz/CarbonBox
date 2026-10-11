import { ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import { IUploadRepository } from "../../../src/document-processing/domain/repositories/IUploadRepository";
import { UploadStatus } from "../../../src/document-processing/domain/value-objects/UploadStatus";
import { App } from "../../../src/main/App";
import { buildContainer } from "../../../src/main/container";
import { IFileStorage } from "../../../src/shared/infrastructure/storage/IFileStorage";
import { multipartBody } from "../../support/multipart";
import { testConfig } from "../../support/testConfig";
import { createTestAwsClients, createTestQueue, testBucket } from "../testAws";

const CSV = "category,amount,unit,date\nElectricity,150.5,kWh,2024-01-15\n";

// Admin del test: crea y lee la cola por fuera de la App, para verificar lo que dejó
const { sqsClient } = createTestAwsClients();
let queue: Awaited<ReturnType<typeof createTestQueue>>;
let app: App;
let container: ReturnType<typeof buildContainer>;

beforeAll(async () => {
  queue = await createTestQueue(sqsClient);
  // El contenedor real, sin dobles: base de tests, bucket de test y una cola propia
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

describe("subida de punta a punta (base de tests y LocalStack)", () => {
  it("deja el archivo intacto en S3, el upload PENDING en la base y un mensaje con su id", async () => {
    const response = await app.server.inject({
      method: "POST",
      url: "/api/v1/uploads",
      ...(await multipartBody({ fileName: "datos.csv", content: CSV })),
    });

    expect(response.statusCode).toBe(202);
    const { id } = response.json();

    const upload = await container.resolve<IUploadRepository>("uploadRepository").findById(id);
    expect(upload?.status.equals(UploadStatus.PENDING)).toBe(true);

    const saved = await container.resolve<IFileStorage>("fileStorage").read(upload?.fileUrl ?? "");
    expect(saved.toString()).toBe(CSV);

    const { Messages } = await sqsClient.send(new ReceiveMessageCommand({ QueueUrl: queue.queueUrl }));
    expect(Messages?.map((message) => message.Body)).toEqual([JSON.stringify({ uploadId: id })]);
  });
});
