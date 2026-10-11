---

description: "Lista de tareas del spec 003-subir-archivo"
---

# Tasks: Subir archivo

**Input**: Documentos de diseño en `specs/003-subir-archivo/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/http-api.md](contracts/http-api.md),
[contracts/ports.md](contracts/ports.md), [quickstart.md](quickstart.md)

**Tests**: TDD con Jest (principio III de la constitución y FR-024). Cada pieza con lógica
tiene primero su test, que DEBE fallar, y después la implementación. Dominio, handlers,
controllers y HTTP van en el proyecto `unit` (sin Docker). S3, SQS y el flujo completo van en
`integration`, contra la base de tests y LocalStack.

**Commits**: un commit por tarea o por par test + implementación, siempre con la suite en
verde.

**Organization**: tareas agrupadas por historia de usuario del spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1 a US5)
- Rutas relativas a la raíz del repositorio. `DP` = `backend/src/document-processing`,
  `SI` = `backend/src/shared/infrastructure`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: LocalStack en Docker con la cola y los buckets, dependencias nuevas y variables
de entorno.

- [X] T001 [P] Crear `.gitattributes` en la raíz con `*.sh text eol=lf`, y `localstack/ready.d/init-aws.sh` con `#!/bin/bash`, `set -euo pipefail` y tres líneas: `awslocal sqs create-queue --queue-name uploads`, `awslocal s3 mb s3://carbonbox-uploads` y `awslocal s3 mb s3://carbonbox-uploads-test` (research §2).
- [X] T002 Agregar a `docker-compose.yml` el servicio `localstack`:
  - `image: localstack/localstack:4.14.0` (comentario: última versión sin token, research §1).
  - `environment: SERVICES: s3,sqs`, `ports: "4566:4566"`.
  - `volumes: ./localstack/ready.d:/etc/localstack/init/ready.d`.
  - `healthcheck` con `curl -sf http://localhost:4566/_localstack/init/ready | grep -q '"completed": true'`, `interval: 5s`, `retries: 20`.

  Verificar: `docker compose up -d --wait` deja `postgres` y `localstack` en `Healthy`, y `docker compose exec localstack awslocal sqs list-queues` y `awslocal s3 ls` muestran la cola y los dos buckets.
- [X] T003 [P] En `backend/` instalar con versión exacta: `npm install --save-exact @aws-sdk/client-sqs@3.1141.0 @aws-sdk/client-s3@3.1141.0 @fastify/multipart@10.1.2`. Verificar que `npm run test:unit` sigue en verde.
- [X] T004 [P] Agregar a `backend/.env.example` (y al `backend/.env` local, no versionado) las variables de data-model.md: `AWS_REGION=us-east-1`, `AWS_ENDPOINT_URL=http://localhost:4566`, `AWS_ACCESS_KEY_ID=test`, `AWS_SECRET_ACCESS_KEY=test`, `S3_BUCKET=carbonbox-uploads`, `SQS_QUEUE_URL=http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/uploads`, `SQS_VISIBILITY_TIMEOUT_SECONDS=60`, `UPLOAD_MAX_FILE_SIZE_MB=10` y `TEST_S3_BUCKET=carbonbox-uploads-test`, con un comentario que diga qué cambiar para AWS real.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: configuración nueva, contratos, clientes del SDK, dobles de test y verificación
de LocalStack en los tests de integración.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

- [ ] T005 Ampliar `backend/tests/unit/config/config.test.ts` (el `env` base de cada test pasa a incluir `S3_BUCKET` y `SQS_QUEUE_URL`):
  - Lee `aws.region`, `aws.endpoint`, `storage.bucket`, `queue.url`, `queue.visibilityTimeoutSeconds` y `upload.maxFileSizeMb` desde el entorno.
  - Valores por defecto: región `us-east-1`, endpoint `""`, ocultamiento `60`, tamaño `10`.
  - Falla nombrando `storage.bucket` si falta `S3_BUCKET`, y `queue.url` si falta `SQS_QUEUE_URL` (FR-022).
  - Falla si `SQS_VISIBILITY_TIMEOUT_SECONDS` es `-1`, `43201` o `abc`, y si `UPLOAD_MAX_FILE_SIZE_MB` es `0`.

  Verificar que falla.
- [ ] T006 Implementar en `backend/src/config/IConvictProps.ts` y `backend/src/config/index.ts` las opciones `aws { region, endpoint }`, `storage { bucket }`, `queue { url, visibilityTimeoutSeconds }` y `upload { maxFileSizeMb }` de data-model.md. `bucket` y `url` usan el formato `required-string` existente; el ocultamiento, un formato propio de entero entre 0 y 43200; el tamaño, un entero mayor que 0. T005 en verde.
- [ ] T007 Crear `backend/tests/support/testConfig.ts` que exporta `testConfig(overrides?)` con una configuración válida completa (puerto 0, base `postgresql://u:p@localhost:1/db`, endpoint `http://localhost:4566`, bucket `test-bucket`, cola `http://localhost:4566/000000000000/test`, ocultamiento 60, tamaño 10) y un merge superficial por sección. Reemplazar las configuraciones armadas a mano en `backend/tests/unit/main/container.test.ts`, `backend/tests/http/health.test.ts` y `backend/tests/http/errors.test.ts`. `npm run test:unit` en verde.
- [ ] T008 [P] Crear los contratos de [contracts/ports.md](contracts/ports.md): `SI/storage/IFileStorage.ts` (`save(content: Buffer): Promise<string>`, `read(location: string): Promise<Buffer>`), `SI/messaging/IMessagePublisher.ts` (`MessageBody = Record<string, unknown>`, `publish(body)`) y `SI/messaging/IMessageConsumer.ts` (`ReceivedMessage { body: unknown; receiveCount: number; receiptHandle: string }`, `receive()`, `delete(message)`), cada uno con un comentario de una línea.
- [ ] T009 [P] Crear `SI/aws/createAwsClients.ts`: `createAwsClients(aws: IConvictProps["aws"])` devuelve `{ sqsClient, s3Client }`. Si `aws.endpoint` no está vacío, lo pasa como `endpoint` a los dos y usa `forcePathStyle: true` en S3; si está vacío, no pasa endpoint (AWS real). Las credenciales no se pasan: las toma el SDK de su cadena (research §6). En `backend/src/main/container.ts` registrar `sqsClient` y `s3Client` con `asValue`. En `backend/src/main/App.ts`, el hook `onClose` también llama a `destroy()` de los dos. Agregar a `container.test.ts` que `sqsClient` es un `SQSClient` y `s3Client` un `S3Client`.
- [ ] T010 [P] Crear los dobles de `backend/tests/support/` (contracts/ports.md, "Dobles para tests"):
  - `CallLog.ts`: un array de strings compartido para registrar el orden de las llamadas.
  - `InMemoryFileStorage.ts`: un `Map`; `save` genera `memory/<uuid>.csv`, guarda una copia del `Buffer` y anota `"storage.save"`; `read` lanza si no existe.
  - `InMemoryMessageQueue.ts`: implementa `IMessagePublisher` e `IMessageConsumer` con un array; `publish` anota `"queue.publish"`; expone `messages` para los tests.
  - `FailingMessagePublisher.ts`: `publish` lanza `new Error("cola caída")`.
  - `InMemoryUploadRepository.ts`: implementa `IUploadRepository` con un `Map`; `save` anota `"repository.save"`.
- [ ] T011 Ampliar `backend/tests/integration/globalSetup.ts`: después de migrar, verificar con `fetch` que `${AWS_ENDPOINT_URL}/_localstack/health` responde 200; si no, fallar con "No responde LocalStack. ¿Está levantado? (docker compose up -d --wait)". Fallar también con mensaje claro si falta `TEST_S3_BUCKET`. Crear `backend/tests/integration/testAws.ts` con `createTestAwsClients()` (desde las variables del entorno) y `createTestQueue()`, que crea una cola con nombre único (`test-<uuid>`) y devuelve `{ queueUrl, deleteQueue }`.

**Checkpoint**: `docker compose up -d --wait` levanta Postgres y LocalStack, y `npm test` sigue en verde.

---

## Phase 3: User Story 1 - Subir un CSV y recibir el comprobante (Priority: P1) 🎯 MVP

**Goal**: un CSV subido por HTTP queda guardado en S3, registrado en PENDING y con su mensaje
en SQS. Los rechazos no dejan nada. Si no se puede encolar, el upload queda FAILED.

**Independent Test**: quickstart.md, pasos 2 y 3, y `npm test`.

### Tests and implementation for User Story 1 ⚠️

> Cada test se escribe PRIMERO y se verifica que FALLA antes de implementar.

- [ ] T012 [P] [US1] Actualizar los tests de dominio para `PENDING → FAILED` (FR-008b):
  - `backend/tests/unit/document-processing/domain/value-objects/UploadStatus.test.ts`: en la matriz, `["PENDING", "FAILED", true]`.
  - `backend/tests/unit/document-processing/domain/entities/Upload.test.ts`: sacar `["PENDING", "FAILED"]` de las transiciones inválidas y agregar "PENDING -> FAILED guarda el mensaje de error".

  Verificar que fallan.
- [ ] T013 [US1] En `DP/domain/value-objects/UploadStatus.ts`, `PENDING: ["PROCESSING", "FAILED"]` con el comentario `// FAILED: no se pudo encolar (spec 003)`. T012 en verde.
- [ ] T014 [P] [US1] Test de `CsvHeader` en `backend/tests/unit/document-processing/domain/value-objects/CsvHeader.test.ts` (FR-003, escenarios 10 y 11, data-model.md):
  - Acepta `category,amount,unit,date\n...`, con `\r\n`, con BOM inicial, con `Category, Amount ,UNIT,date` y un archivo que es solo el encabezado sin salto final.
  - Rechaza con `ValidationError`: columnas en otro orden, una de menos, una de más, otro nombre (`fecha,monto`), una fila de datos como primera línea, bytes binarios y más de 1024 bytes sin `\n`.
  - El mensaje contiene `"category,amount,unit,date"` y lo recibido, recortado a 100 caracteres.
- [ ] T015 [US1] Implementar `DP/domain/value-objects/CsvHeader.ts` según research §8: `EXPECTED_CSV_COLUMNS`, extiende `ValueObject<readonly string[]>`, constructor privado, `static fromContent(content: Uint8Array): Either<ValidationError, CsvHeader>`. Usa `TextDecoder`, no `Buffer`. T014 en verde.
- [ ] T016 [P] [US1] Test de integración `backend/tests/integration/document-processing/S3FileStorage.test.ts`, contra el bucket `TEST_S3_BUCKET`:
  - `save` devuelve una ubicación que cumple `/^uploads\/[0-9a-f-]{36}\.csv$/`.
  - `read(save(x))` devuelve exactamente los bytes de `x`, con BOM, `\r\n` y `ñ`.
  - Dos `save` del mismo contenido dan ubicaciones distintas.
  - `read` de una ubicación inexistente rechaza.
- [ ] T017 [US1] Implementar `DP/infrastructure/storage/S3FileStorage.ts` (research §5): constructor `(s3Client: S3Client, config: IConvictProps)`; `save` hace `PutObject` en `uploads/<randomUUID()>.csv` con `ContentType: "text/csv"`; `read` hace `GetObject` y devuelve `Buffer.from(await Body.transformToByteArray())`. T016 en verde.
- [ ] T018 [P] [US1] Test de integración `backend/tests/integration/document-processing/SqsMessagePublisher.test.ts`, con una cola propia de `createTestQueue()`: después de `publish({ uploadId: "abc" })`, un `ReceiveMessage` directo con el SDK trae un mensaje cuyo `Body` es `{"uploadId":"abc"}`.
- [ ] T019 [US1] Implementar `DP/infrastructure/messaging/SqsMessagePublisher.ts`: constructor `(sqsClient: SQSClient, config: IConvictProps)`; `publish` hace `SendMessage` a `config.queue.url` con `JSON.stringify(body)`. T018 en verde.
- [ ] T020 [P] [US1] Test de `CreateUploadCommandHandler` en `backend/tests/unit/document-processing/application/commands/CreateUploadCommandHandler.test.ts`, con los dobles de `tests/support/` (escenarios de US1 y data-model.md, "Pasos de execute"):
  - Caso feliz: devuelve `{ id, status: "PENDING", fileName: "datos.csv", createdAt }`; el storage tiene los mismos bytes; el repositorio tiene un upload PENDING de `user-123` cuyo `fileUrl` es la ubicación; la cola tiene un solo mensaje `{ uploadId: id }`; el `CallLog` es `["storage.save", "repository.save", "queue.publish"]`.
  - Rechazos con `ValidationError` y sin nada guardado ni publicado: `file: null`, `datos.txt`, 0 bytes, encabezado incorrecto.
  - Se acepta un encabezado con BOM y mayúsculas.
  - Dos subidas de `datos.csv` crean dos uploads con ubicaciones distintas.
  - Con `FailingMessagePublisher`: `execute` rechaza con el mismo error de la cola, y el upload del repositorio queda FAILED con `errorMessage` `"No se pudo encolar el archivo para procesarlo"`.
- [ ] T021 [US1] Implementar `DP/application/commands/objects/CreateUploadCommand.ts` (con el tipo `UploadedFile`) y `DP/application/commands/handlers/CreateUploadCommandHandler.ts` según data-model.md: implementa `ICommandHandler<CreateUploadCommand, UploadReceipt>`, recibe `fileStorage`, `uploadRepository` y `messagePublisher` por constructor (interfaces), sigue los pasos 1 a 8 en orden, y el camino FAILED vive en un método privado con el único `try/catch` (research §10). T020 en verde.
- [ ] T022 [US1] Soporte multipart:
  - `SI/http/IHttpRequest.ts`: agregar `IHttpFile { fileName: string; content: Buffer }`, `headers: unknown` y `file?: IHttpFile`.
  - `SI/http/adaptRoute.ts`: pasar `headers`; si `request.isMultipart()`, tomar `await request.file()` y, si existe, `{ fileName: part.filename, content: await part.toBuffer() }`. Sin `try/catch`.
  - `backend/src/main/App.ts`: registrar `@fastify/multipart` con `limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024, files: 1 }`, antes de las rutas.

  `npm run test:unit` sigue en verde.
- [ ] T023 [P] [US1] Test de `CreateUploadController` en `backend/tests/unit/document-processing/presentation/controllers/CreateUploadController.test.ts`, con un handler doble: arma un `CreateUploadCommand` con el `file` del request (o `null` si no hay) y `userId: "user-123"`; un `right` responde `202` con el comprobante; un `left` lanza ese error.
- [ ] T024 [US1] Implementar `DP/presentation/controllers/CreateUploadController.ts`: extiende `BaseController`, recibe `createUploadCommandHandler` (`ICommandHandler`), constante `USER_ID = "user-123"` con el comentario de research §13, y `this.respond(result, 202)`. T023 en verde.
- [ ] T025 [US1] Conectar la subida:
  - `DP/presentation/routes/DocumentProcessingRoutes.ts`: `registerDocumentProcessingRoutes(server, container)` registra `POST /api/v1/uploads` con `adaptRoute`.
  - `backend/src/main/App.ts` llama a esa función.
  - `DP/infrastructure/dependency-injection/DocumentProcessingModule.ts` registra `fileStorage` (`S3FileStorage`), `messagePublisher` (`SqsMessagePublisher`), `createUploadCommandHandler` y `createUploadController`, todos `singleton`.
  - `container.test.ts`: `fileStorage` es `S3FileStorage` y `messagePublisher` es `SqsMessagePublisher`.
- [ ] T026 [US1] Test HTTP `backend/tests/http/uploads.test.ts`, describe `POST /api/v1/uploads`, con la App real y los dobles registrados encima (como `health.test.ts`); el cuerpo multipart se arma con `FormData`, `Blob` y `new Response(form)` (research §15):
  - `202` con `id`, `status`, `fileName` y `createdAt`.
  - `400 VALIDATION_ERROR`: petición sin multipart, `datos.txt`, archivo vacío y encabezado incorrecto, sin nada guardado.
  - `413` con un archivo mayor que `upload.maxFileSizeMb: 1`.
  - Con dos archivos se usa el primero.
- [ ] T027 [US1] Test de integración `backend/tests/integration/document-processing/uploadFlow.test.ts` (SC-002): App con el contenedor real, `TEST_DATABASE_URL`, `TEST_S3_BUCKET` y una cola de `createTestQueue()`. Un `POST` deja un objeto en S3 idéntico al enviado, un upload PENDING en la base de tests con ese `fileUrl` y un mensaje con su `id`.

**Checkpoint**: US1 completa. Quickstart pasos 2 y 3 con `curl`.

---

## Phase 4: User Story 2 - Consultar el estado de un upload (Priority: P2)

**Goal**: `GET /api/v1/uploads/:id` devuelve el estado y "no encontrado" sin error interno.

**Independent Test**: quickstart.md, paso 4.

- [ ] T028 [P] [US2] Test de `GetUploadByIdQueryHandler` en `backend/tests/unit/document-processing/application/queries/GetUploadByIdQueryHandler.test.ts` con `InMemoryUploadRepository`: un upload PENDING devuelve el `UploadView` de data-model.md (fechas ISO, sin `fileUrl` ni `userId`); uno COMPLETED trae sus conteos; uno FAILED, su mensaje; un id inexistente da `left(NotFoundError)`.
- [ ] T029 [US2] Implementar `DP/application/queries/objects/GetUploadByIdQuery.ts` y `DP/application/queries/handlers/GetUploadByIdQueryHandler.ts` (`IQueryHandler<GetUploadByIdQuery, UploadView>`, recibe `uploadRepository`; `NotFoundError("No existe un upload con id <id>")`). T028 en verde.
- [ ] T030 [P] [US2] Test de `GetUploadByIdController` en `backend/tests/unit/document-processing/presentation/controllers/GetUploadByIdController.test.ts`: toma el `id` de `params`, responde `200` con la vista, y lanza ante un `left`.
- [ ] T031 [US2] Implementar `DP/presentation/controllers/GetUploadByIdController.ts`. Como `params` es `unknown`, lee `id` con un chequeo de tipo; si no es un texto, pasa `""` (que el repositorio no encuentra → 404). T030 en verde.
- [ ] T032 [US2] Registrar `GET /api/v1/uploads/:id` en `DocumentProcessingRoutes.ts`, y `getUploadByIdQueryHandler` y `getUploadByIdController` en `DocumentProcessingModule.ts`.
- [ ] T033 [US2] Agregar a `backend/tests/http/uploads.test.ts` el describe `GET /api/v1/uploads/:id`: `200` con todos los campos de contracts/http-api.md y sin `fileUrl` ni `userId`; `404 NOT_FOUND` para un UUID inexistente y para `abc`.

**Checkpoint**: US1 y US2 completas. Quickstart paso 4.

---

## Phase 5: User Story 3 - La cola entrega los avisos entre procesos (Priority: P3)

**Goal**: `SqsMessageConsumer` cumple el contrato de recibir, ocultar, volver a entregar y
confirmar.

**Independent Test**: `npm run test:integration` (quickstart.md, paso 6).

- [ ] T034 [P] [US3] Test de integración `backend/tests/integration/document-processing/SqsMessageQueue.test.ts`, con una cola propia por `describe` y ocultamiento de 1 s (escenarios de US3, research §4):
  - Cola vacía: `receive()` devuelve `null`.
  - Dos `publish`: se reciben en orden, con `receiveCount` 1 y `body` parseado.
  - Recibido y no confirmado: otro `receive()` inmediato no lo trae.
  - Al vencer el ocultamiento vuelve con `receiveCount` 2. Se pregunta en un bucle cada 250 ms con un tope de 5 s, nunca con una espera fija.
  - `delete` lo elimina; un segundo `delete` del mismo mensaje no lanza.
  - 20 `receive()` simultáneos sobre 5 mensajes entregan 5 distintos (SC-005).
- [ ] T035 [US3] Implementar `DP/infrastructure/messaging/SqsMessageConsumer.ts`: constructor `(sqsClient, config)`; `receive` usa `ReceiveMessage` con `MaxNumberOfMessages: 1`, `WaitTimeSeconds: 0`, `VisibilityTimeout: config.queue.visibilityTimeoutSeconds` y `MessageSystemAttributeNames: ["ApproximateReceiveCount"]`, y devuelve `ReceivedMessage` (con `JSON.parse` del body) o `null`; `delete` usa `DeleteMessage`. Registrar `messageConsumer` en `DocumentProcessingModule.ts` y en `container.test.ts`. T034 en verde.

**Checkpoint**: la cola completa, lista para el worker del spec 005.

---

## Phase 6: User Story 4 - Cambiar a servicios en la nube sin tocar la lógica (Priority: P4)

**Goal**: queda documentado y probado que pasar a AWS es solo configuración.

**Independent Test**: quickstart.md, paso 7.

- [ ] T036 [US4] En `README.md`, sección "Pasar de LocalStack a AWS": las variables que cambian (vaciar `AWS_ENDPOINT_URL`; región, `S3_BUCKET`, `SQS_QUEUE_URL` y credenciales de un usuario IAM con permisos mínimos sobre esa cola y ese bucket), cómo crear la cola y el bucket en AWS, y que no hay que tocar código. Verificar el paso 7 del quickstart (falta `S3_BUCKET` → no arranca y nombra `storage.bucket`; ya cubierto por T005).

**Checkpoint**: US4 lista para validarse contra AWS cuando el autor conecte su cuenta.

---

## Phase 7: User Story 5 - Evitar uploads duplicados por reintentos (Priority: P5, opcional)

**Goal**: la misma `Idempotency-Key` no crea dos uploads (research §14). Se hace solo si las
fases anteriores están terminadas.

**Independent Test**: tests de abajo; dos `curl` con el mismo header devuelven el mismo `id`.

- [ ] T037 [P] [US5] Tests de dominio y mapper: `Upload.create` acepta `idempotencyKey` opcional (`null` por defecto), rechaza una clave vacía o de más de 255 caracteres; `PrismaUploadMapper` mantiene la ida y vuelta con la clave.
- [ ] T038 [US5] Implementar: `idempotencyKey String? @unique` en `DP/infrastructure/persistence/models/schema.prisma` y `npm run db:migrate -- --name add_idempotency_key`; campo en `Upload` y en el mapper. T037 en verde.
- [ ] T039 [P] [US5] Tests de integración en `PrismaUploadRepository.test.ts`: `findByIdempotencyKey` encuentra por clave y devuelve `null` si no existe; guardar otro upload con la misma clave lanza `DuplicateIdempotencyKeyError`.
- [ ] T040 [US5] Implementar `findByIdempotencyKey` en `IUploadRepository` y `PrismaUploadRepository`, y en `save` traducir el `P2002` sobre `idempotencyKey` a `DuplicateIdempotencyKeyError` (nuevo en `backend/src/shared/domain/errors.ts`). Sumar el método a `InMemoryUploadRepository`. T039 en verde.
- [ ] T041 [P] [US5] Tests del handler: con una clave ya usada devuelve el mismo comprobante sin guardar archivo ni publicar; ante `DuplicateIdempotencyKeyError` (carrera simulada con un repositorio doble) devuelve el comprobante del upload ganador; sin clave, el comportamiento de US1 no cambia.
- [ ] T042 [US5] Implementar: `idempotencyKey` en `CreateUploadCommand`; el controller lo lee del header `idempotency-key` con un chequeo de tipo; el handler sigue research §14. Agregar a `uploads.test.ts` que dos `POST` con la misma clave devuelven el mismo `id`. T041 en verde.

**Checkpoint**: si esta fase no se hace, T043 la documenta como limitación.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T043 [P] Actualizar `README.md`: servicios de Docker (Postgres y LocalStack 4.14.0, por qué esa versión), variables nuevas, endpoints `POST` y `GET`, el orden del flujo (registro antes de publicar), y "Limitaciones conocidas": LocalStack sin persistencia, sin parches de seguridad, upload en PENDING si fallan a la vez la cola y la base (patrón outbox), archivos huérfanos en S3, mensaje del 413 en inglés y, si no se hizo, la clave de idempotencia con su diseño.
- [ ] T044 [P] Actualizar en `CLAUDE.md` la sección "Cómo se ejecuta" (`docker compose up -d --wait` levanta también LocalStack; copiar las variables nuevas del `.env.example`).
- [ ] T045 [P] Registrar el spec 003 en `USO-DE-IA.md`: qué se generó con IA, qué se corrigió (el plan paralelo con disco y Postgres descartado; el hallazgo del token de LocalStack; el ajuste del orden y la entrega de SQS) y qué se aprendió.
- [ ] T046 Validar de punta a punta con [quickstart.md](quickstart.md), pasos 1 a 8, desde un estado limpio (`docker compose down` y `up -d --wait`), y con `npm test` y `npm run typecheck` en verde. Marcar en el spec SC-001 a SC-008 verificados.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. Bloquea todas las historias.
- **US1 (Phase 3)**: depende de Foundational.
- **US2 (Phase 4)**: depende de Foundational. Usa el repositorio del 002; sus tests HTTP
  arman uploads con el repositorio doble, así que no depende de US1 para probarse.
- **US3 (Phase 5)**: depende de Foundational (contratos y `createTestQueue`). Independiente
  de US1 y US2.
- **US4 (Phase 6)**: depende de US1 (documenta su configuración).
- **US5 (Phase 7)**: depende de US1. Opcional.
- **Polish (Phase 8)**: al final.

### Within Each User Story

- Test antes que implementación, y el test tiene que fallar primero.
- Dominio → infraestructura → handler → controller → rutas y módulo → HTTP → integración.

### Parallel Opportunities

- Setup: T001, T003 y T004 en paralelo; T002 después de T001.
- Foundational: T008, T009 y T010 en paralelo después de T006 y T007.
- US1: T012, T014, T016, T018 y T020 (tests) en paralelo; después cada implementación.
- US2 y US3 se pueden hacer en paralelo entre sí una vez terminada Foundational.

## Parallel Example: User Story 1

```text
Tests en paralelo (archivos distintos):
  T012 UploadStatus.test.ts / Upload.test.ts
  T014 CsvHeader.test.ts
  T016 S3FileStorage.test.ts
  T018 SqsMessagePublisher.test.ts
  T020 CreateUploadCommandHandler.test.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 y Phase 2.
2. Phase 3 (US1).
3. **Parar y validar** con el quickstart (pasos 2 y 3): ya se puede subir un CSV de punta a
   punta.

### Incremental Delivery

1. US1 → subida funcionando (MVP).
2. US2 → consulta del estado (lo que el frontend necesita para el polling).
3. US3 → la cola completa para el worker del spec 005.
4. US4 → documentación del paso a AWS.
5. US5 → solo si sobra tiempo.
6. Polish → README, CLAUDE.md, USO-DE-IA.md y validación desde cero.
