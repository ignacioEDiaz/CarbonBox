# Contrato: almacenamiento y mensajería

Las tres interfaces que separan la lógica de la infraestructura. Los handlers y el worker
dependen solo de ellas (FR-019). La implementación habla con S3 y SQS: LocalStack en local,
AWS cuando se conecte la cuenta. En los tests de la lógica se usan dobles en memoria que
cumplen estas mismas tablas.

## IFileStorage

`backend/src/shared/infrastructure/storage/IFileStorage.ts`

```ts
export interface IFileStorage {
  // Guarda el contenido sin modificarlo y devuelve su ubicación (texto opaco)
  save(content: Buffer): Promise<string>;
  read(location: string): Promise<Buffer>;
}
```

| Método | Comportamiento |
|---|---|
| `save` | Guarda `content` byte a byte en una ubicación nueva y única. Nunca usa el nombre que mandó el usuario |
| `read` | Devuelve exactamente los bytes guardados. Si la ubicación no existe, lanza |

| Implementación | Ubicación devuelta | Dónde queda |
|---|---|---|
| `S3FileStorage` | `uploads/<uuid>.csv` | Objeto con esa clave en `S3_BUCKET`, `ContentType: text/csv` |

## IMessagePublisher

`backend/src/shared/infrastructure/messaging/IMessagePublisher.ts`

```ts
export type MessageBody = Record<string, unknown>;

export interface IMessagePublisher {
  publish(body: MessageBody): Promise<void>;
}
```

| Método | Comportamiento |
|---|---|
| `publish` | Deja el mensaje disponible para cualquier proceso que consuma la cola. Cuando la promesa resuelve, el mensaje ya está guardado en la cola. Si no se pudo publicar, lanza |

## IMessageConsumer

`backend/src/shared/infrastructure/messaging/IMessageConsumer.ts`

```ts
export type ReceivedMessage = {
  body: unknown;          // quien consume valida la forma
  receiveCount: number;   // cuántas veces se entregó, contando esta
  receiptHandle: string;  // lo que la cola necesita para confirmarlo
};

export interface IMessageConsumer {
  receive(): Promise<ReceivedMessage | null>;
  delete(message: ReceivedMessage): Promise<void>;
}
```

| Método | Comportamiento |
|---|---|
| `receive` | Entrega un mensaje disponible y lo oculta por `SQS_VISIBILITY_TIMEOUT_SECONDS`, o devuelve `null` enseguida si no hay ninguno (no espera) |
| `delete` | Elimina el mensaje para siempre. Si ya se había eliminado, no hace nada y no lanza |

Reglas:

- **Al menos una vez:** un mensaje recibido y no confirmado vuelve a entregarse al vencer el
  ocultamiento, con `receiveCount` incrementado. Quien consume tiene que ser idempotente
  (spec 002).
- **Orden aproximado:** el más antiguo primero, sin garantía estricta en AWS (en LocalStack
  se verificó el orden).
- **`body` llega parseado** (`JSON.parse` del `MessageBody`), pero tipado como `unknown`.

| Implementación | `publish` | `receive` | `delete` |
|---|---|---|---|
| `SqsMessagePublisher` / `SqsMessageConsumer` | `SendMessage` | `ReceiveMessage` (1 mensaje, `WaitTimeSeconds: 0`, `VisibilityTimeout` de la configuración, con `ApproximateReceiveCount`) | `DeleteMessage` con el `ReceiptHandle` |

## Dobles para tests (`backend/tests/support/`)

| Doble | Para qué |
|---|---|
| `InMemoryFileStorage` | Un `Map` de ubicación a contenido |
| `InMemoryMessageQueue` | Implementa `IMessagePublisher` e `IMessageConsumer` con un array. Es el "mock en memoria" de la consigna, usado donde sí funciona: dentro de un solo proceso |
| `FailingMessagePublisher` | Lanza al publicar, para probar el camino FAILED |
| `InMemoryUploadRepository` | Un `Map` de id a `Upload` |

Los dobles anotan el orden de las llamadas en un registro compartido, para verificar que el
archivo se guarda antes que el upload y que se publica al final.
