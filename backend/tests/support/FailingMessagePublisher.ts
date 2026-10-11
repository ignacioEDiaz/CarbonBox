import { IMessagePublisher } from "../../src/shared/infrastructure/messaging/IMessagePublisher";

// Simula la cola caída: publicar siempre lanza
export class FailingMessagePublisher implements IMessagePublisher {
  readonly error = new Error("cola caída");

  async publish(): Promise<void> {
    throw this.error;
  }
}
