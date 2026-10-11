import { ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import { SqsMessagePublisher } from "../../../src/document-processing/infrastructure/messaging/SqsMessagePublisher";
import { testConfig } from "../../support/testConfig";
import { createTestAwsClients, createTestQueue } from "../testAws";

const { sqsClient } = createTestAwsClients();
let queue: Awaited<ReturnType<typeof createTestQueue>>;

beforeAll(async () => {
  queue = await createTestQueue(sqsClient);
});

afterAll(async () => {
  await queue.deleteQueue();
  sqsClient.destroy();
});

describe("SqsMessagePublisher (LocalStack)", () => {
  it("publica el cuerpo como JSON en la cola configurada", async () => {
    const publisher = new SqsMessagePublisher(sqsClient, testConfig({ queue: { url: queue.queueUrl } }));

    await publisher.publish({ uploadId: "abc" });

    // Se lee con el SDK directo, sin pasar por el consumer del spec, para probar solo el publisher
    const { Messages } = await sqsClient.send(new ReceiveMessageCommand({ QueueUrl: queue.queueUrl }));
    expect(Messages?.map((message) => message.Body)).toEqual(['{"uploadId":"abc"}']);
  });
});
