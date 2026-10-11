# Research: Subir archivo

Decisiones técnicas del spec 003. Lo que tenía riesgo se probó el 2026-10-11 en un proyecto
descartable, fuera del repositorio:

- **LocalStack 4.14.0** en Docker Desktop (Windows), sin token, con el SDK de AWS v3
  (`@aws-sdk/client-sqs` y `@aws-sdk/client-s3` 3.1141.0) sobre Node 24.14.
- **Subida multipart** (la probó una sesión anterior): Fastify 5.12.5 con
  `@fastify/multipart` 10.x y `server.inject`.

No se probó contra AWS real: no hay cuenta conectada todavía (US4).

## 1. Emulador: LocalStack 4.14.0, fijado

- **Decisión:** SQS y S3 corren en LocalStack, imagen `localstack/localstack:4.14.0`, como un
  servicio más del `docker-compose.yml`. El código usa el SDK oficial de AWS y solo cambia el
  endpoint: LocalStack en local, AWS real cuando el autor conecte su cuenta (US4).
- **Por qué esa versión exacta:**
  - Desde la versión 2026.03.0 (23 de marzo de 2026), `localstack/localstack:latest` exige un
    `LOCALSTACK_AUTH_TOKEN`; sin él, el contenedor sale con código 55. El token gratuito es del
    plan Hobby, para uso no comercial, y requiere cuenta.
  - La 4.14.0 (26 de febrero de 2026) es la última edición community. **Probado:** arranca sin
    token y `/_localstack/health` responde `"edition": "community", "version": "4.14.0"`.
  - Con token, quien clone el repositorio (por ejemplo, quien evalúa) tendría que crearse una
    cuenta de LocalStack. Fijar la versión cumple SC-007a: un comando, sin cuenta.
- **Costo aceptado:** la 4.14.0 no recibe parches de seguridad. Es un emulador que solo escucha
  en `localhost` durante el desarrollo; no va a producción. Se documenta en el README.
- **Alternativas:**
  - *`latest` con token Hobby:* obliga a cada persona a tener cuenta (ver arriba).
  - *Tabla de Postgres como cola y disco:* habría que programar a mano el ocultamiento, el
    contador de entregas y la concurrencia (`FOR UPDATE SKIP LOCKED`), y después reemplazarlo
    por SQS. Lo descartó el autor en el spec.
  - *ElasticMQ (SQS) + MinIO (S3):* maduros y sin token, pero son dos contenedores y la cola y
    el bucket se crean con un paso aparte. Queda como plan B: si LocalStack 4.14.0 dejara de
    funcionar, se cambia el `docker-compose.yml` y el código no se toca.
  - *Array en memoria* (el mock de la consigna): no cruza procesos. Se usa como doble en los
    tests unitarios, donde sí sirve.

## 2. Cola y bucket creados al arrancar

- **Decisión:** un script `localstack/ready.d/init-aws.sh`, montado en
  `/etc/localstack/init/ready.d/`, que LocalStack ejecuta cuando está listo:

  ```bash
  awslocal sqs create-queue --queue-name uploads
  awslocal s3 mb s3://carbonbox-uploads
  awslocal s3 mb s3://carbonbox-uploads-test
  ```

- **Healthcheck** del servicio en compose, para que `docker compose up -d --wait` vuelva
  recién cuando la cola y el bucket existen:

  ```bash
  curl -sf http://localhost:4566/_localstack/init/ready | grep -q '"completed": true'
  ```

- **Probado:** el script corre (`"state": "SUCCESSFUL"`), la imagen trae `curl`, y el
  healthcheck da OK.
- **Cuidado en Windows:** si git convierte el `.sh` a fin de línea `\r\n`, bash falla con
  `$'\r': command not found`. Se agrega `.gitattributes` con `*.sh text eol=lf`.
- **Sin persistencia:** en la edición community, LocalStack pierde los mensajes y archivos al
  reiniciar el contenedor (la persistencia es paga). El script vuelve a crear la cola y el
  bucket vacíos. Un upload que quedó en la base apuntando a un archivo perdido fallará al
  procesarse (spec 005). Es una limitación del entorno local y va al README.

## 3. Contratos con la forma de S3 y SQS

- **Decisión:** tres interfaces, donde las pone la consigna:
  - `shared/infrastructure/storage/IFileStorage.ts`: `save(content)` devuelve la ubicación;
    `read(location)` devuelve el contenido.
  - `shared/infrastructure/messaging/IMessagePublisher.ts`: `publish(body)`.
  - `shared/infrastructure/messaging/IMessageConsumer.ts`: `receive()` devuelve un mensaje o
    `null`; `delete(message)` lo confirma. El mensaje trae `body`, `receiveCount` y
    `receiptHandle`.
- **Por qué:** cada operación es una llamada del SDK, así que las clases de infraestructura
  son traducciones cortas:

  | Contrato | SQS / S3 |
  |---|---|
  | `publish(body)` | `SendMessage` con `JSON.stringify(body)` |
  | `receive()` | `ReceiveMessage` de 1 mensaje, `WaitTimeSeconds: 0`, `VisibilityTimeout` de la configuración, pidiendo `ApproximateReceiveCount` |
  | `delete(message)` | `DeleteMessage` con el `ReceiptHandle` |
  | `save(content)` | `PutObject` en `uploads/<uuid>.csv` |
  | `read(location)` | `GetObject` y `transformToByteArray()` |

- **Los handlers dependen de las interfaces, no del SDK** (FR-019). Así se testean con dobles
  en memoria, sin LocalStack, y el día de mañana se puede cambiar de proveedor.
- **`IMessageConsumer` y `read` se implementan acá aunque los use el spec 005:** son la otra
  mitad de cada contrato, US3 los pide, y `read` permite testear `save` con una ida y vuelta
  (FR-011).

## 4. Comportamiento de SQS verificado contra LocalStack

Resultados de la prueba, sobre una cola nueva por corrida:

| Caso | Resultado | Requisito |
|---|---|---|
| Cola vacía | `ReceiveMessage` no trae mensajes | US3-1 |
| Dos mensajes publicados | Se entregan en orden, con `ApproximateReceiveCount` 1 | FR-013, FR-016 |
| Pedir con los dos ocultos | No trae nada | FR-014 |
| Vence el ocultamiento (2 s) | Reaparece con contador 2, a los ~2,8 s | FR-015, FR-016 |
| `DeleteMessage` dos veces con el mismo recibo | Sin error | FR-017 |
| `DeleteMessage` con el recibo de una entrega anterior | Sin error | FR-017 |
| 20 `ReceiveMessage` simultáneos sobre 5 mensajes | 5 entregas, 5 distintas | FR-018, SC-005 |

Consecuencias para los tests y para el spec:

- **LocalStack revisa el vencimiento cada ~1 s.** Con 2,5 s de espera fija el mensaje todavía
  no había vuelto. Los tests de vencimiento usan un ocultamiento de 1 s y **preguntan en un
  bucle con un tope de 5 s**, en vez de dormir un tiempo fijo.
- **El tiempo de ocultamiento se pasa en cada `ReceiveMessage`** (`VisibilityTimeout`), desde
  la configuración (`SQS_VISIBILITY_TIMEOUT_SECONDS`). Así FR-014 ("tiempo configurable") se
  cumple igual en LocalStack y en AWS, sin depender de cómo se creó la cola.
- **En AWS real, una cola estándar no garantiza el orden ni la entrega única:** el orden es
  aproximado y, en casos excepcionales, un mensaje puede entregarse dos veces. En LocalStack
  se verificó orden y entrega única. Se ajustan FR-013 y FR-018 del spec para decirlo, y la
  protección real ante duplicados es la idempotencia del procesamiento (spec 002).
- **`receive()` no espera** (`WaitTimeSeconds: 0`). Si el worker del spec 005 conviene que use
  *long polling*, se decide ahí.

## 5. Almacenamiento en S3

- **Decisión:** `S3FileStorage.save(content)` genera la clave `uploads/<uuid>.csv`, hace
  `PutObject` con `ContentType: text/csv` y devuelve la clave. Esa clave es la "ubicación" que
  se guarda en `Upload.fileUrl` (texto opaco, spec 002).
- **Por qué:** el nombre que manda el usuario nunca forma parte de la clave (FR-007), así que
  dos `datos.csv` no se pisan y un nombre como `../../x.csv` no hace daño. El `uploadId` no
  sirve como clave porque el upload todavía no existe cuando se guarda el archivo: necesita la
  ubicación para crearse.
- **Probado:** un contenido con BOM, `\r\n` y `ñ` vuelve idéntico byte a byte; un objeto
  inexistente da `NoSuchKey`, que `read` deja propagar.
- **`forcePathStyle: true` cuando hay endpoint configurado** (LocalStack): las URLs quedan
  `http://localhost:4566/<bucket>/<clave>` y no dependen de DNS con el nombre del bucket. Con
  AWS real (sin endpoint) se usa el estilo por defecto.

## 6. Configuración

- **Decisión:** nuevas opciones en Convict (`config/index.ts`):

  | Variable | Opción | Por defecto | Regla |
  |---|---|---|---|
  | `AWS_REGION` | `aws.region` | `us-east-1` | No vacía |
  | `AWS_ENDPOINT_URL` | `aws.endpoint` | `""` | Vacía = AWS real. En `.env.example`: `http://localhost:4566` |
  | `S3_BUCKET` | `storage.bucket` | sin valor | Obligatoria |
  | `SQS_QUEUE_URL` | `queue.url` | sin valor | Obligatoria |
  | `SQS_VISIBILITY_TIMEOUT_SECONDS` | `queue.visibilityTimeoutSeconds` | `60` | Entero entre 0 y 43200 |
  | `UPLOAD_MAX_FILE_SIZE_MB` | `upload.maxFileSizeMb` | `10` | Entero mayor que 0 |

- **Credenciales fuera de Convict:** `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` las lee el
  SDK de su cadena estándar. En `.env.example` van con `test` / `test` (LocalStack acepta
  cualquier valor); el `.env` real está en `.gitignore`. En AWS se usa un usuario IAM con
  permisos mínimos sobre esa cola y ese bucket, nunca la cuenta raíz. Así no hay credenciales
  en el repositorio (FR-022) y en producción el SDK puede tomar las del rol de la máquina sin
  cambiar código.
- **Obligatorias sin valor por defecto** (`S3_BUCKET`, `SQS_QUEUE_URL`): si faltan, Convict
  corta el arranque y el error nombra la opción (FR-022, US4-3), con el mismo formato
  `required-string` del spec 001.
- **URL de la cola en LocalStack:**
  `http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/uploads` (la que devuelve
  el emulador). El SDK manda los pedidos al endpoint configurado y la URL viaja como dato.
  Probado.
- **Pasar a AWS (US4):** vaciar `AWS_ENDPOINT_URL`, poner la región, el bucket, la URL de la
  cola y las credenciales reales. Cero cambios de código (SC-007).

## 7. Clientes del SDK en el contenedor

- **Decisión:** `shared/infrastructure/aws/createAwsClients.ts` crea un `SQSClient` y un
  `S3Client` a partir de `config.aws`, y el contenedor los registra como `sqsClient` y
  `s3Client`. Las clases de infraestructura los reciben por constructor, igual que los
  repositorios reciben `prismaClient`.
- **Por qué:** un solo lugar arma la configuración del SDK (región, endpoint, path style), y
  los tests de integración pueden pasar un cliente propio apuntando a una cola de test.

## 8. Encabezado del CSV

- **Decisión:** value object `CsvHeader` en `domain/value-objects/`, con
  `CsvHeader.fromContent(content: Uint8Array): Either<ValidationError, CsvHeader>`:
  1. Toma los bytes hasta el primer `\n`, con un tope de 1 KB (un archivo binario sin saltos
     de línea no se recorre entero).
  2. Los decodifica como UTF-8, saca un BOM inicial y un `\r` final.
  3. Separa por coma, recorta espacios y pasa a minúsculas cada nombre.
  4. Compara con `category,amount,unit,date`, en ese orden.
- **Error:** `El encabezado debe ser "category,amount,unit,date" y llegó "<recibido>"`, con lo
  recibido recortado a 100 caracteres.
- **Por qué en el dominio:** el formato del CSV es una regla del negocio y la tiene que usar
  también el parser del spec 004 (FR-003a). Un value object es el lugar donde ya viven
  `FileName` y `UploadStatus`. Usa `Uint8Array` y `TextDecoder`, que son del lenguaje, no de
  una librería.
- **Alternativa:** ponerlo en `CsvParserService` (`application/services`, previsto por la
  consigna para el spec 004). Se descartó para no adelantar un servicio de otro spec; el 004
  lo usa desde el dominio.

## 9. Subida multipart

- **Decisión:**
  - Se suma `@fastify/multipart` 10.1.2, registrado con
    `limits: { fileSize: maxFileSizeMb * 1024 * 1024, files: 1 }`.
  - `IHttpRequest` gana `file?: { fileName: string; content: Buffer }` y `headers: unknown`
    (este último para la clave de idempotencia de US5). Los completa `adaptRoute`, que sigue
    siendo el único archivo que conoce a Fastify.
  - El controller arma el command; si no hay archivo, pasa `file: null` y es el handler el que
    devuelve el error de validación (el controller no decide nada).
- **Por qué:** Fastify no interpreta `multipart/form-data`, y hacerlo a mano es largo y frágil
  (constitución, principio IV).
- **Comportamiento probado** (sesión anterior):

  | Caso | Qué pasa |
  |---|---|
  | CSV normal | `request.file()` trae `filename`, y `toBuffer()` el contenido exacto |
  | Petición que no es multipart | `request.isMultipart()` es `false` |
  | Multipart sin archivo | `request.file()` devuelve `undefined` |
  | 0 bytes | llega con largo 0: lo rechaza el handler |
  | Mayor que el límite | `toBuffer()` lanza un error 413 (`FST_REQ_FILE_TOO_LARGE`) |
  | Dos archivos | se obtiene el primero, sin error (FR-001) |

- **El 413** ya lo traduce el manejador central del spec 001 (cualquier 4xx de Fastify) como
  `VALIDATION_ERROR`, sin código nuevo. El mensaje llega en inglés (`request file too large`);
  alcanza para el escenario 6 de US1.
- **No se valida el tipo de contenido declarado:** el mismo CSV llega como `text/csv` o
  `application/octet-stream` según el cliente. Vale la extensión.
- **Buffer, no stream:** con 10 MB de máximo, tener el archivo en memoria es simple. Para
  archivos grandes se pasaría el stream directo a S3 (mejora anotada).

## 10. Orden de los pasos y fallas parciales

- **Pasos de `CreateUploadCommandHandler`:**
  1. Si no hay archivo → `left(ValidationError)`.
  2. `FileName.create` → `left` si es inválido.
  3. Contenido de 0 bytes → `left(ValidationError("El archivo está vacío"))`.
  4. `CsvHeader.fromContent` → `left` si el encabezado no es el esperado.
  5. `fileStorage.save(content)` → ubicación.
  6. `Upload.create` y `uploadRepository.save`.
  7. `messagePublisher.publish({ uploadId })`.
  8. `right` con el comprobante.
- **Las validaciones van antes de tocar S3:** una subida rechazada no deja nada (FR-006).
- **Si falla publicar (paso 7):** el handler atrapa ese error, marca el upload FAILED con "No
  se pudo encolar el archivo para procesarlo", lo guarda y **vuelve a lanzar el error
  original**, para que el manejador central responda 500 y lo deje en el log (FR-008a). Es el
  único `try/catch` del handler, y está ahí porque decidir qué hacer cuando no se puede
  encolar es una regla del caso de uso (la constitución prohíbe `try/catch` en controllers,
  no en handlers). Si guardar el FAILED también falla, se lanza ese error y el upload queda en
  PENDING: limitación documentada, con el patrón *outbox* como solución.
- **Las fallas de infraestructura en los pasos 5 y 6** se propagan como excepción y terminan
  en 500 (FR-023). Si falla el paso 6, queda un archivo huérfano en S3: no lo ve nadie, y en
  producción lo limpiaría una *lifecycle policy* del bucket.

## 11. PENDING → FAILED

- **Decisión:** `ALLOWED_TRANSITIONS.PENDING` pasa a `["PROCESSING", "FAILED"]` en
  `UploadStatus`. Se actualizan sus tests: la matriz (`PENDING → FAILED` pasa a permitida) y
  la lista de transiciones inválidas de `Upload.test.ts`, más un test de la transición nueva.
- **Por qué:** es la regla que pide FR-008b. Vive donde viven las demás transiciones, así que
  ni la API ni el worker la pueden saltear.

## 12. La subida responde 202 Accepted

- **Decisión:** `POST /api/v1/uploads` responde `202` con `{ id, status, fileName, createdAt }`.
- **Por qué:** 202 significa "aceptado, todavía sin procesar", que es lo que dice el
  comprobante (FR-005). `201 Created` también es defendible porque el upload existe, pero no
  distingue recibido de terminado.

## 13. Usuario del upload

- **Decisión:** el controller pone `userId: "user-123"` en el command, desde una constante.
- **Por qué:** identificar al usuario es tarea de la puerta de entrada. El día que haya
  autenticación, ese valor sale del token y el handler no cambia.

## 14. Clave de idempotencia (US5, opcional, al final)

- **Diseño:**
  - Migración: columna `idempotencyKey String? @unique` en `Upload`.
  - `Upload` gana `idempotencyKey: string | null`; `Upload.create` la acepta opcional y la
    valida (no vacía, hasta 255 caracteres).
  - `IUploadRepository.findByIdempotencyKey(key)`.
  - El controller lee el header `Idempotency-Key` y lo pasa en el command.
  - El handler, si hay clave, busca primero: si existe un upload con esa clave, devuelve su
    comprobante sin guardar archivo ni publicar.
  - **Carrera** (dos envíos simultáneos con la misma clave): los dos buscan, ninguno encuentra
    y los dos intentan guardar. El índice único deja pasar uno; Prisma lanza `P2002` al otro.
    `PrismaUploadRepository.save` traduce `P2002` sobre esa columna a un
    `DuplicateIdempotencyKeyError` (error de dominio), y el handler, al verlo, busca el upload
    ganador y devuelve su comprobante. El segundo envío deja un archivo huérfano en S3
    (aceptado, ver §10).
- **Si no se llega:** va a "Limitaciones conocidas" con este diseño. El doble clic lo evita el
  frontend (spec 007) deshabilitando el botón con el `isPending` de React Query.

## 15. Tests

- **Handlers y controllers (unitarios, test-first):** con dobles en memoria de los tres
  contratos y del repositorio, en `tests/support/`. Los dobles registran el orden de las
  llamadas, para verificar que el archivo se guarda antes que el upload y que se publica al
  final. Un doble de publisher que falla prueba el camino FAILED.
- **`CsvHeader` y `UploadStatus` (unitarios, test-first):** casos de la spec (BOM, `\r\n`,
  mayúsculas, espacios, orden distinto, columnas de más o de menos, binario, sin `\n`).
- **HTTP (`server.inject`, sin Docker):** el contenedor real con los dobles registrados
  encima, como en `health.test.ts`. El cuerpo multipart se arma con `FormData` y `Blob` de
  Node y `new Response(form)`, que entrega el cuerpo y el `content-type` con su `boundary`
  (probado, sin librerías).
- **SQS y S3 (integración, contra LocalStack):**
  - Cada archivo de test de la cola crea **su propia cola** con un nombre único en `beforeAll`
    y la borra en `afterAll`. Así "el más antiguo primero" no depende de restos de otros tests,
    y no hace falta `PurgeQueue` (que en AWS tiene un mínimo de 60 s entre llamadas).
  - S3 usa el bucket `carbonbox-uploads-test`; cada test escribe claves nuevas.
  - El vencimiento se prueba con ocultamiento de 1 s y un bucle con tope de 5 s (§4).
- **Flujo completo (integración):** una subida por HTTP con el contenedor real, la base de
  tests, el bucket de test y una cola propia, que verifica las tres cosas de SC-002.
- **`globalSetup`** además de migrar la base, verifica que LocalStack responda en el endpoint
  configurado y, si no, corta con "¿Está levantado? (docker compose up -d --wait)".
- Los tests existentes arman la configuración a mano (`{ port, database }`). Al crecer
  `IConvictProps` dejan de compilar: se centraliza en `tests/support/testConfig.ts`.
