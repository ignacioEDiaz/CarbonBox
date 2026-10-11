import { CreateQueueCommand, DeleteQueueCommand, SQSClient } from "@aws-sdk/client-sqs";
import { randomUUID } from "node:crypto";
import { AwsClients, createAwsClients } from "../../src/shared/infrastructure/aws/createAwsClients";

// Clientes apuntando a LocalStack, con la configuración del .env
export function createTestAwsClients(): AwsClients {
  return createAwsClients({
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint: process.env.AWS_ENDPOINT_URL ?? "",
  });
}

export function testBucket(): string {
  const bucket = process.env.TEST_S3_BUCKET;
  if (!bucket) throw new Error("Falta TEST_S3_BUCKET en backend/.env (ver .env.example)");
  return bucket;
}

// Una cola nueva por archivo de test: "el más antiguo primero" no depende de restos de otros
// tests, y no hace falta PurgeQueue (que en AWS exige 60 s entre llamadas)
export async function createTestQueue(sqsClient: SQSClient): Promise<{ queueUrl: string; deleteQueue: () => Promise<void> }> {
  const { QueueUrl } = await sqsClient.send(new CreateQueueCommand({ QueueName: `test-${randomUUID()}` }));
  if (QueueUrl === undefined) throw new Error("LocalStack no devolvió la URL de la cola");
  return {
    queueUrl: QueueUrl,
    deleteQueue: async () => {
      await sqsClient.send(new DeleteQueueCommand({ QueueUrl }));
    },
  };
}
