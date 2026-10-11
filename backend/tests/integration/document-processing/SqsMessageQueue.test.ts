import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { SqsMessageConsumer } from "../../../src/document-processing/infrastructure/messaging/SqsMessageConsumer";
import { SqsMessagePublisher } from "../../../src/document-processing/infrastructure/messaging/SqsMessagePublisher";
import { ReceivedMessage } from "../../../src/shared/infrastructure/messaging/IMessageConsumer";
import { testConfig } from "../../support/testConfig";
import { createTestAwsClients, createTestQueue } from "../testAws";

const { sqsClient } = createTestAwsClients();
let queue: Awaited<ReturnType<typeof createTestQueue>>;

// Una cola nueva por test: lo que entrega no depende de lo que dejaron los demás
beforeEach(async () => {
  queue = await createTestQueue(sqsClient);
});

afterEach(async () => {
  await queue.deleteQueue();
});

afterAll(() => {
  sqsClient.destroy();
});

function queuePair(visibilityTimeoutSeconds: number) {
  const config = testConfig({ queue: { url: queue.queueUrl, visibilityTimeoutSeconds } });
  return { publisher: new SqsMessagePublisher(sqsClient, config), consumer: new SqsMessageConsumer(sqsClient, config) };
}

// Los tests que esperan el vencimiento hacen polling hasta 5 s: el timeout por defecto de Jest
// (5 s) no alcanza si la máquina está cargada, así que esos tests tienen uno propio más largo
const POLLING_TEST_TIMEOUT_MS = 15_000;

// LocalStack revisa el vencimiento del ocultamiento cada ~1 s: en vez de dormir un tiempo fijo,
// se pregunta cada 250 ms hasta un tope
async function receiveWithin(consumer: SqsMessageConsumer, timeoutMs: number): Promise<ReceivedMessage | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const message = await consumer.receive();
    if (message !== null) return message;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

describe("SqsMessageConsumer (LocalStack)", () => {
  it("una cola vacía devuelve null", async () => {
    const { consumer } = queuePair(30);

    await expect(consumer.receive()).resolves.toBeNull();
  });

  it("entrega los mensajes del más antiguo al más nuevo, con el cuerpo parseado y una entrega", async () => {
    const { publisher, consumer } = queuePair(30);
    await publisher.publish({ uploadId: "a" });
    await publisher.publish({ uploadId: "b" });

    const first = await consumer.receive();
    const second = await consumer.receive();

    expect([first?.body, first?.receiveCount]).toEqual([{ uploadId: "a" }, 1]);
    expect([second?.body, second?.receiveCount]).toEqual([{ uploadId: "b" }, 1]);
  });

  it("un mensaje recibido y no confirmado queda oculto para los demás", async () => {
    const { publisher, consumer } = queuePair(30);
    await publisher.publish({ uploadId: "a" });

    await consumer.receive();

    await expect(consumer.receive()).resolves.toBeNull();
  });

  it("al vencer el ocultamiento vuelve a entregarse, con el contador en 2", async () => {
    const { publisher, consumer } = queuePair(1);
    await publisher.publish({ uploadId: "a" });
    await consumer.receive();

    const again = await receiveWithin(consumer, 5000);

    expect([again?.body, again?.receiveCount]).toEqual([{ uploadId: "a" }, 2]);
  }, POLLING_TEST_TIMEOUT_MS);

  it("un mensaje confirmado no vuelve, y confirmarlo otra vez no falla", async () => {
    const { publisher, consumer } = queuePair(1);
    await publisher.publish({ uploadId: "a" });
    const message = await consumer.receive();
    if (message === null) throw new Error("no llegó el mensaje");

    await consumer.delete(message);
    await expect(consumer.delete(message)).resolves.toBeUndefined();

    await expect(receiveWithin(consumer, 3000)).resolves.toBeNull();
  }, POLLING_TEST_TIMEOUT_MS);

  it("un cuerpo que no es JSON se entrega como texto, sin que receive() falle", async () => {
    const { consumer } = queuePair(30);
    await sqsClient.send(new SendMessageCommand({ QueueUrl: queue.queueUrl, MessageBody: "no es json" }));

    const message = await consumer.receive();

    expect(message?.body).toBe("no es json");
  });

  it("20 consumidores simultáneos sobre 5 mensajes reciben 5 mensajes distintos", async () => {
    const { publisher, consumer } = queuePair(30);
    for (const uploadId of ["a", "b", "c", "d", "e"]) {
      await publisher.publish({ uploadId });
    }

    const received = await Promise.all(Array.from({ length: 20 }, () => consumer.receive()));

    const bodies = received.filter((message) => message !== null).map((message) => JSON.stringify(message.body));
    expect(bodies).toHaveLength(5);
    expect(new Set(bodies).size).toBe(5);
  });
});
