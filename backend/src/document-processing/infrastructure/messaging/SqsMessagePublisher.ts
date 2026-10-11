import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { IConvictProps } from "../../../config/IConvictProps";
import { IMessagePublisher, MessageBody } from "../../../shared/infrastructure/messaging/IMessagePublisher";

// Publica en SQS (LocalStack en local). Si SQS no responde, el SDK lanza y quien publica decide.
export class SqsMessagePublisher implements IMessagePublisher {
  private readonly queueUrl: string;

  constructor(
    private readonly sqsClient: SQSClient,
    config: IConvictProps,
  ) {
    this.queueUrl = config.queue.url;
  }

  async publish(body: MessageBody): Promise<void> {
    await this.sqsClient.send(new SendMessageCommand({ QueueUrl: this.queueUrl, MessageBody: JSON.stringify(body) }));
  }
}
