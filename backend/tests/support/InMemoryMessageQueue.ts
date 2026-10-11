import { randomUUID } from "node:crypto";
import { IMessageConsumer, ReceivedMessage } from "../../src/shared/infrastructure/messaging/IMessageConsumer";
import { IMessagePublisher, MessageBody } from "../../src/shared/infrastructure/messaging/IMessagePublisher";
import { CallLog } from "./CallLog";

type StoredMessage = { body: MessageBody; receiveCount: number; receiptHandle: string; inFlight: boolean };

// El "mock en memoria" de la consigna, usado donde sí sirve: dentro de un solo proceso (tests).
// No simula el vencimiento del ocultamiento: un mensaje recibido queda oculto hasta el delete.
export class InMemoryMessageQueue implements IMessagePublisher, IMessageConsumer {
  private readonly stored: StoredMessage[] = [];

  constructor(private readonly log = new CallLog()) {}

  // Los cuerpos publicados que siguen en la cola, en orden
  get messages(): MessageBody[] {
    return this.stored.map((message) => message.body);
  }

  async publish(body: MessageBody): Promise<void> {
    this.log.record("queue.publish");
    this.stored.push({ body, receiveCount: 0, receiptHandle: randomUUID(), inFlight: false });
  }

  async receive(): Promise<ReceivedMessage | null> {
    const next = this.stored.find((message) => !message.inFlight);
    if (next === undefined) return null;
    next.inFlight = true;
    next.receiveCount += 1;
    return { body: next.body, receiveCount: next.receiveCount, receiptHandle: next.receiptHandle };
  }

  async delete(message: ReceivedMessage): Promise<void> {
    const index = this.stored.findIndex((stored) => stored.receiptHandle === message.receiptHandle);
    if (index !== -1) this.stored.splice(index, 1);
  }
}
