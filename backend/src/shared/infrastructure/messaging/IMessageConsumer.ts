export type ReceivedMessage = {
  body: unknown; // quien consume valida la forma
  receiveCount: number; // cuántas veces se entregó, contando esta
  receiptHandle: string; // lo que la cola necesita para confirmarlo
};

// Consume mensajes de la cola con entrega "al menos una vez": un mensaje recibido queda oculto
// un tiempo y, si nadie lo confirma con delete, vuelve a entregarse.
export interface IMessageConsumer {
  // Devuelve un mensaje disponible, o null enseguida si no hay ninguno
  receive(): Promise<ReceivedMessage | null>;
  // Lo elimina para siempre; si ya no existía, no hace nada
  delete(message: ReceivedMessage): Promise<void>;
}
