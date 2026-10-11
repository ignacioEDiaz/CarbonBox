# Data Model: Subir archivo

Este spec no agrega tablas para la cola ni para los archivos: viven en SQS y S3 (LocalStack en
local). Cambia una regla de `UploadStatus`, suma el value object `CsvHeader`, la
configuración nueva y los objetos de los dos casos de uso. US5 (opcional) suma una columna a
`Upload`.

## UploadStatus: una transición nueva

```ts
const ALLOWED_TRANSITIONS: Record<UploadStatusValue, UploadStatusValue[]> = {
  PENDING: ["PROCESSING", "FAILED"],                  // FAILED: no se pudo encolar (spec 003)
  PROCESSING: ["PROCESSING", "COMPLETED", "FAILED"],  // PROCESSING -> PROCESSING: reintento
  COMPLETED: [],
  FAILED: [],
};
```

```text
          ┌──────── no se pudo encolar ────────┐
          │                                    ▼
PENDING ──┴──► PROCESSING ──┬──► COMPLETED   FAILED
                 ▲     │    └──────────────────▲
                 └─────┘ reintento             │
                       └───────────────────────┘
```

`markAsFailed` sigue exigiendo un mensaje no vacío. Ninguna otra transición cambia.

## CsvHeader: value object nuevo (`domain/value-objects/CsvHeader.ts`)

```ts
export const EXPECTED_CSV_COLUMNS = ["category", "amount", "unit", "date"] as const;

// El valor es el encabezado normalizado ("category,amount,unit,date"). Es un string y no un
// array porque ValueObject.equals compara con ===, y dos arrays iguales no son ===.
export class CsvHeader extends ValueObject<string> {
  static fromContent(content: Uint8Array): Either<ValidationError, CsvHeader>;
}
```

| Regla | Detalle |
|---|---|
| Qué lee | Los bytes hasta el primer `\n`, con un tope de 1024 bytes |
| Normaliza | Saca un BOM inicial y un `\r` final; recorta espacios y pasa a minúsculas cada nombre |
| Válido | Exactamente `category,amount,unit,date`, en ese orden |
| Error | `ValidationError('El encabezado debe ser "category,amount,unit,date" y llegó "<recibido>"')`, con lo recibido recortado a 100 caracteres |

Lo usa `CreateUploadCommandHandler` (este spec) y lo va a usar el parser del spec 004
(FR-003a).

## Configuración (`config/IConvictProps.ts`)

```ts
export interface IConvictProps {
  port: number;
  database: { url: string };
  aws: {
    region: string;
    endpoint: string;          // "" = AWS real; http://localhost:4566 = LocalStack
  };
  storage: { bucket: string };
  queue: {
    url: string;
    visibilityTimeoutSeconds: number;
  };
  upload: { maxFileSizeMb: number };
}
```

| Variable | Opción | Por defecto | Regla |
|---|---|---|---|
| `AWS_REGION` | `aws.region` | `us-east-1` | No vacía |
| `AWS_ENDPOINT_URL` | `aws.endpoint` | `""` | Vacía = AWS real |
| `S3_BUCKET` | `storage.bucket` | — | Obligatoria |
| `SQS_QUEUE_URL` | `queue.url` | — | Obligatoria |
| `SQS_VISIBILITY_TIMEOUT_SECONDS` | `queue.visibilityTimeoutSeconds` | `60` | Entero de 0 a 43200 |
| `UPLOAD_MAX_FILE_SIZE_MB` | `upload.maxFileSizeMb` | `10` | Entero mayor que 0 |

`AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` no pasan por Convict: las lee el SDK
(research §6).

Valores de `.env.example` para LocalStack:

```env
AWS_REGION=us-east-1
AWS_ENDPOINT_URL=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_BUCKET=carbonbox-uploads
SQS_QUEUE_URL=http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/uploads
SQS_VISIBILITY_TIMEOUT_SECONDS=60
UPLOAD_MAX_FILE_SIZE_MB=10
TEST_S3_BUCKET=carbonbox-uploads-test
```

## Petición HTTP (`shared/infrastructure/http/IHttpRequest.ts`)

```ts
export interface IHttpFile {
  fileName: string;
  content: Buffer;
}

export interface IHttpRequest {
  params: unknown;
  query: unknown;
  body: unknown;
  headers: unknown;    // nuevo: lo usa el header Idempotency-Key (US5)
  file?: IHttpFile;    // nuevo: presente solo si la petición trajo un archivo
}
```

## CreateUpload: command (`application/commands/`)

```ts
// objects/CreateUploadCommand.ts: solo datos
export class CreateUploadCommand {
  constructor(
    readonly file: UploadedFile | null,   // null si la petición no trajo archivo
    readonly userId: string,
  ) {}
}

export type UploadedFile = { fileName: string; content: Buffer };

// handlers/CreateUploadCommandHandler.ts
export type UploadReceipt = {
  id: string;
  status: "PENDING";
  fileName: string;
  createdAt: string;   // ISO 8601
};
```

Pasos de `execute`, en orden (FR-002 a FR-008a):

| # | Paso | Si falla |
|---|---|---|
| 1 | `command.file` no es `null` | `left(ValidationError("Falta el archivo: enviá un CSV en el campo \"file\""))` |
| 2 | `FileName.create(file.fileName)` | `left(ValidationError)` |
| 3 | `file.content.length > 0` | `left(ValidationError("El archivo está vacío"))` |
| 4 | `CsvHeader.fromContent(file.content)` | `left(ValidationError)` |
| 5 | `fileStorage.save(file.content)` devuelve la ubicación | excepción → 500 |
| 6 | `Upload.create(...)` y `uploadRepository.save(upload)` | excepción → 500 (queda un archivo huérfano) |
| 7 | `messagePublisher.publish({ uploadId: upload.id })` | `upload.markAsFailed(...)`, `save`, se relanza el error → 500 |
| 8 | `right(UploadReceipt)` | |

Dependencias por constructor (nombres que resuelve Awilix): `fileStorage`,
`uploadRepository`, `messagePublisher`.

## GetUploadById: query (`application/queries/`)

```ts
// objects/GetUploadByIdQuery.ts
export class GetUploadByIdQuery {
  constructor(readonly id: string) {}
}

// handlers/GetUploadByIdQueryHandler.ts
export type UploadView = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  fileName: string;
  totalRows: number | null;
  processedRows: number | null;
  failedRows: number | null;
  errorMessage: string | null;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
};
```

- `uploadRepository.findById(id)` devuelve `null` → `left(NotFoundError("No existe un upload
  con id <id>"))`. Un id mal formado (`abc`) también da `null` (probado en el spec 002).
- `UploadView` no incluye `fileUrl` ni `userId` (FR-009).
- El handler devuelve este objeto plano y no la entidad, para que `presentation` no dependa de
  `domain`.

## Mensaje de procesamiento

```json
{ "uploadId": "8b0e5c0e-3a52-4c0e-9d53-0d2a0f1c7a11" }
```

Es lo único que viaja por la cola (CLAUDE.md, decisiones tomadas), serializado con
`JSON.stringify` como `MessageBody` de SQS. Lo consume el worker del spec 005, que valida su
forma porque llega como `unknown`.

## Registro en el contenedor

`buildContainer` registra los clientes del SDK y `registerDocumentProcessingModule` suma a lo
del spec 002:

| Nombre | Implementación | Depende de |
|---|---|---|
| `sqsClient` | `SQSClient` de `createAwsClients(config.aws)` | — |
| `s3Client` | `S3Client` de `createAwsClients(config.aws)` | — |
| `fileStorage` | `S3FileStorage` | `s3Client`, `config` |
| `messagePublisher` | `SqsMessagePublisher` | `sqsClient`, `config` |
| `messageConsumer` | `SqsMessageConsumer` | `sqsClient`, `config` |
| `createUploadCommandHandler` | `CreateUploadCommandHandler` | `fileStorage`, `uploadRepository`, `messagePublisher` |
| `getUploadByIdQueryHandler` | `GetUploadByIdQueryHandler` | `uploadRepository` |
| `createUploadController` | `CreateUploadController` | `createUploadCommandHandler` |
| `getUploadByIdController` | `GetUploadByIdController` | `getUploadByIdQueryHandler` |

Todos `singleton`. El hook `onClose` de `App` también llama a `destroy()` de los dos clientes
del SDK, como ya hace con `$disconnect()` de Prisma.

## US5 (opcional): clave de idempotencia

```prisma
model Upload {
  // ... campos del spec 002
  idempotencyKey String? @unique
}
```

| Cambio | Detalle |
|---|---|
| `Upload` | `idempotencyKey: string \| null`; `create` la acepta opcional y la valida (no vacía, hasta 255 caracteres) |
| `IUploadRepository` | `findByIdempotencyKey(key): Promise<Upload \| null>` |
| `PrismaUploadRepository.save` | traduce `P2002` sobre `idempotencyKey` a `DuplicateIdempotencyKeyError` (`shared/domain/errors.ts`) |
| `CreateUploadCommand` | `idempotencyKey: string \| null` |
| Handler | si hay clave y ya existe un upload con ella, devuelve su comprobante sin guardar ni publicar; ante `DuplicateIdempotencyKeyError` (carrera), busca el ganador y devuelve el suyo |
