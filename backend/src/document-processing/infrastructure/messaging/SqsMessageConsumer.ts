import { DeleteMessageCommand, Message, ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { IConvictProps } from "../../../config/IConvictProps";
import { IMessageConsumer, ReceivedMessage } from "../../../shared/infrastructure/messaging/IMessageConsumer";

// Consume de SQS (LocalStack en local) de a un mensaje
export class SqsMessageConsumer implements IMessageConsumer {
  private readonly queueUrl: string;
  private readonly visibilityTimeoutSeconds: number;

  constructor(
    private readonly sqsClient: SQSClient,
    config: IConvictProps,
  ) {
    this.queueUrl = config.queue.url;
    this.visibilityTimeoutSeconds = config.queue.visibilityTimeoutSeconds;
  }

  async receive(): Promise<ReceivedMessage | null> {
    const { Messages } = await this.sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 0, // no espera: si no hay mensajes, vuelve enseguida
        // Se pasa en cada pedido para que el ocultamiento salga de la configuración y no de
        // cómo se creó la cola
        VisibilityTimeout: this.visibilityTimeoutSeconds,
        MessageSystemAttributeNames: ["ApproximateReceiveCount"],
      }),
    );
    const message = Messages?.[0];
    return message === undefined ? null : toReceivedMessage(message);
  }

  // SQS no falla si el mensaje ya se había borrado: confirmar dos veces es inofensivo
  async delete(message: ReceivedMessage): Promise<void> {
    await this.sqsClient.send(new DeleteMessageCommand({ QueueUrl: this.queueUrl, ReceiptHandle: message.receiptHandle }));
  }
}

function toReceivedMessage(message: Message): ReceivedMessage {
  if (message.ReceiptHandle === undefined) {
    throw new Error("SQS devolvió un mensaje sin ReceiptHandle");
  }
  return {
    body: parseBody(message.Body ?? ""),
    receiveCount: Number(message.Attributes?.ApproximateReceiveCount ?? "1"),
    receiptHandle: message.ReceiptHandle,
  };
}

// Un cuerpo que no es JSON se entrega como texto: quien consume lo valida y decide qué hacer,
// en lugar de que receive() falle siempre con el mismo mensaje
function parseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
