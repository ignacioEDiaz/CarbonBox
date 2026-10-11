export type MessageBody = Record<string, unknown>;

// Publica mensajes en la cola. La implementación es SQS (LocalStack en local).
export interface IMessagePublisher {
  // Cuando la promesa resuelve, el mensaje ya está guardado en la cola; si no se pudo, lanza
  publish(body: MessageBody): Promise<void>;
}
