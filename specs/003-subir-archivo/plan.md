# Implementation Plan: Subir archivo

**Branch**: `003-subir-archivo` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-subir-archivo/spec.md`

## Summary

Primer caso de uso de escritura y primero de lectura del bounded context, más la frontera con
S3 y SQS:

- **Contratos (`shared/infrastructure`):** `IFileStorage`, `IMessagePublisher` e
  `IMessageConsumer`. Los handlers dependen solo de ellos.
- **Implementación única con el SDK de AWS:** `S3FileStorage`, `SqsMessagePublisher` y
  `SqsMessageConsumer`. En local apuntan a **LocalStack 4.14.0** (la última versión sin
  token, verificada); para pasar a AWS se cambia solo la configuración (endpoint y
  credenciales).
- **Casos de uso:** `CreateUploadCommandHandler` (valida archivo, nombre, tamaño y
  encabezado; guarda en S3; crea el upload en PENDING; publica `{ uploadId }`; si no puede
  publicar, marca el upload FAILED) y `GetUploadByIdQueryHandler`. Los dos devuelven `Either`.
- **Dominio:** value object `CsvHeader` (la regla del encabezado, que reutiliza el spec 004) y
  la transición `PENDING → FAILED` en `UploadStatus`.
- **HTTP:** `POST /api/v1/uploads` (multipart, responde 202) y `GET /api/v1/uploads/:id`.
- **Opcional, al final:** la clave de idempotencia (US5).

Ver [research.md](research.md), [data-model.md](data-model.md), los
[contratos](contracts/) y la [guía de validación](quickstart.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`) sobre Node.js 24, CommonJS, igual que los
specs anteriores.

**Primary Dependencies**:
- Las del 001 y 002 (Fastify 5.12.5, Prisma 7.10.0 con `@prisma/adapter-pg`, Awilix 13,
  Convict, Jest 30 + ts-jest).
- Nuevas: `@aws-sdk/client-sqs` 3.1141.0 y `@aws-sdk/client-s3` 3.1141.0 (probadas contra
  LocalStack, research §4 y §5) y `@fastify/multipart` 10.1.2 (research §9).

**Storage**:
- PostgreSQL 15 (Docker): sin cambios de schema, salvo la columna de US5 si se implementa.
- S3 y SQS en LocalStack 4.14.0 (Docker, puerto 4566): bucket `carbonbox-uploads` (y
  `carbonbox-uploads-test`) y cola `uploads`, creados por el script de inicio.

**Testing**:
- Unitarios (proyecto `unit`, sin Docker): `CsvHeader`, `UploadStatus`, `Upload`, los dos
  handlers y los dos controllers con dobles; configuración y registro en el contenedor.
- HTTP (proyecto `unit`, `server.inject`): los dos endpoints con el contenedor real y dobles.
- Integración (proyecto `integration`, base de tests + LocalStack): `SqsMessagePublisher` y
  `SqsMessageConsumer` sobre una cola propia por archivo de test, `S3FileStorage` sobre el
  bucket de test, y el flujo completo de una subida.

**Target Platform**: desarrollo local en Windows con Docker Desktop.

**Project Type**: servicio web (backend).

**Performance Goals**: subir 1 MB y consultar un upload en menos de 1 s cada uno (SC-001,
SC-004).

**Constraints**:
- `domain` y `application` no importan Fastify, Prisma ni el SDK de AWS.
- Los handlers dependen de interfaces; las clases concretas solo aparecen en el módulo de DI.
- Controllers sin lógica de negocio ni `try/catch`.
- Sin `any`.
- Ninguna credencial real en el repositorio.

**Scale/Scope**: unos 16 archivos fuente nuevos, unos 10 modificados y unos 14 de test. US5
suma una migración y toca 6 archivos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple este plan | Estado |
|---|---|---|
| I. DDD + Clean + CQRS | Un command y una query, cada uno con su handler que devuelve `Either`. Los handlers reciben `IUploadRepository`, `IFileStorage` e `IMessagePublisher` por constructor. Las reglas nuevas viven en el dominio: `CsvHeader` y la transición `PENDING → FAILED` en `UploadStatus`. Los controllers traducen HTTP a command o query y usan `respond`. El SDK de AWS solo aparece en `infrastructure`. | ✅ |
| II. Estructura de la consigna | `application/commands/{handlers,objects}`, `application/queries/{handlers,objects}`, `infrastructure/messaging/Sqs*`, `infrastructure/storage/S3FileStorage`, `presentation/{controllers,routes}` y `shared/infrastructure/messaging/I*`, tal cual el árbol. `IFileStorage` en `shared/infrastructure/storage/`, agregado previsto por la constitución. Desvíos justificados abajo. | ✅ con desvíos justificados |
| III. TDD | `CsvHeader`, `UploadStatus`, handlers y controllers test-first con dobles. Las implementaciones de S3 y SQS tienen tests de integración contra LocalStack (FR-024). | ✅ |
| IV. Legible y mínimo | Tres dependencias nuevas, justificadas. Una sola implementación por contrato: no hay selector de proveedor, el cambio a AWS es de configuración. Excepciones anotadas abajo. | ✅ con excepciones justificadas |
| V. Punta a punta | Termina con un CSV subido por HTTP, guardado en S3, registrado en PENDING y con su mensaje en SQS, verificable con `curl` (quickstart). US5 es opcional y no bloquea. | ✅ |
| Restricciones: Docker solo para infra | `docker-compose.yml` suma LocalStack, como prevé la constitución ("y LocalStack si se usa"). La API sigue corriendo con `npm`. | ✅ |

**Re-check post diseño:** sin violaciones nuevas. Los artefactos de fase 1 no agregan
dependencias ni capas fuera de lo de arriba.

## Project Structure

### Documentation (this feature)

```text
specs/003-subir-archivo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-api.md          # los dos endpoints
│   └── ports.md             # IFileStorage, IMessagePublisher, IMessageConsumer
└── tasks.md                 # lo genera /speckit-tasks
```

### Source Code (repository root)

```text
.gitattributes                           # nuevo: *.sh con fin de línea LF
docker-compose.yml                       # + servicio localstack (4.14.0, healthcheck)
localstack/
└── ready.d/
    └── init-aws.sh                      # crea la cola y los buckets al arrancar
backend/
├── package.json                         # + @aws-sdk/client-sqs, @aws-sdk/client-s3, @fastify/multipart
├── .env.example                         # + AWS_*, S3_BUCKET, SQS_*, UPLOAD_MAX_FILE_SIZE_MB, TEST_S3_BUCKET
├── src/
│   ├── config/
│   │   ├── IConvictProps.ts             # + aws, storage, queue, upload
│   │   └── index.ts                     # + schema de esas opciones
│   ├── main/
│   │   ├── App.ts                       # + multipart, rutas del contexto, destroy() de los clientes AWS
│   │   └── container.ts                 # + sqsClient y s3Client
│   ├── shared/
│   │   ├── domain/errors.ts             # + DuplicateIdempotencyKeyError (solo US5)
│   │   └── infrastructure/
│   │       ├── aws/createAwsClients.ts  # SQSClient y S3Client desde config.aws
│   │       ├── http/
│   │       │   ├── IHttpRequest.ts      # + headers y file opcional
│   │       │   └── adaptRoute.ts        # + lee el archivo si la petición es multipart
│   │       ├── messaging/
│   │       │   ├── IMessagePublisher.ts
│   │       │   └── IMessageConsumer.ts
│   │       └── storage/
│   │           └── IFileStorage.ts
│   └── document-processing/
│       ├── domain/value-objects/
│       │   ├── CsvHeader.ts             # nuevo
│       │   └── UploadStatus.ts          # + PENDING -> FAILED
│       ├── application/
│       │   ├── commands/
│       │   │   ├── objects/CreateUploadCommand.ts
│       │   │   └── handlers/CreateUploadCommandHandler.ts
│       │   └── queries/
│       │       ├── objects/GetUploadByIdQuery.ts
│       │       └── handlers/GetUploadByIdQueryHandler.ts
│       ├── infrastructure/
│       │   ├── messaging/
│       │   │   ├── SqsMessagePublisher.ts
│       │   │   └── SqsMessageConsumer.ts
│       │   ├── storage/
│       │   │   └── S3FileStorage.ts
│       │   └── dependency-injection/
│       │       └── DocumentProcessingModule.ts  # + storage, mensajería, handlers, controllers
│       └── presentation/
│           ├── controllers/
│           │   ├── CreateUploadController.ts
│           │   └── GetUploadByIdController.ts
│           └── routes/
│               └── DocumentProcessingRoutes.ts
└── tests/
    ├── support/
    │   ├── testConfig.ts                # configuración válida para tests
    │   ├── InMemoryUploadRepository.ts
    │   ├── InMemoryFileStorage.ts
    │   ├── InMemoryMessageQueue.ts      # publisher y consumer en memoria
    │   └── FailingMessagePublisher.ts
    ├── unit/
    │   ├── config/config.test.ts        # + opciones nuevas
    │   ├── main/container.test.ts       # + registros nuevos
    │   └── document-processing/
    │       ├── domain/value-objects/{CsvHeader,UploadStatus}.test.ts
    │       ├── domain/entities/Upload.test.ts           # + PENDING -> FAILED
    │       ├── application/...          # los dos handlers
    │       └── presentation/...         # los dos controllers
    ├── http/uploads.test.ts             # POST y GET con server.inject
    └── integration/
        ├── globalSetup.ts               # + verifica que LocalStack responda
        └── document-processing/
            ├── SqsMessageQueue.test.ts  # publicar, recibir, ocultar, vencer, confirmar, concurrencia
            ├── S3FileStorage.test.ts    # ida y vuelta de bytes, ubicación inexistente
            └── uploadFlow.test.ts       # subida completa: S3 + upload + mensaje
```

**Structure Decision**: se completan `application` y `presentation` del bounded context y se
estrenan `infrastructure/messaging` e `infrastructure/storage`, en las rutas de la consigna.
Los contratos van en `shared/infrastructure` porque no son del negocio: son la frontera con
servicios externos y los puede usar cualquier contexto. Como en la consigna hay una sola
implementación por contrato (`Sqs*` y `S3FileStorage`), no hace falta un selector de
proveedor: LocalStack o AWS se elige con el endpoint.

## Orden de implementación

| Fase | Historia | Qué queda funcionando |
|---|---|---|
| A | Base común | LocalStack en compose con el script de inicio y `.gitattributes`; configuración nueva y `testConfig`; los tres contratos; los dobles en memoria; `createAwsClients`; `globalSetup` que verifica LocalStack. **Checkpoint:** `docker compose up -d --wait` deja la cola y los buckets, y los tests existentes siguen en verde |
| B | US1 | `CsvHeader` y `PENDING → FAILED` (test-first); `S3FileStorage` y `SqsMessagePublisher` con integración; command y handler (test-first, incluido el camino FAILED); multipart en `adaptRoute`; controller y ruta `POST`. **Checkpoint:** subir con `curl` y ver el objeto en S3, el upload en PENDING y el mensaje en la cola |
| C | US2 | Query y handler, controller y ruta `GET`. **Checkpoint:** consultar el upload recién subido y `abc` |
| D | US3 | `SqsMessageConsumer` con sus tests de integración (orden, ocultamiento, vencimiento, `delete` repetido, concurrencia). **Checkpoint:** `npm run test:integration` en verde |
| E | US4 | Documentar en README y `.env.example` qué variables cambian para AWS, y el test de configuración faltante. La prueba contra AWS real queda para cuando el autor conecte la cuenta |
| F | US5 (opcional) | Clave de idempotencia (research §14). Si no se llega, va a "Limitaciones conocidas" |

Si el tiempo no alcanza, D puede pasar al spec 005 y F quedar como limitación documentada, sin
tocar A, B ni C.

## Complexity Tracking

| Agregado o desvío | Por qué hace falta | Alternativa más simple descartada porque |
|---|---|---|
| LocalStack fijado en 4.14.0 (sin parches de seguridad) | Es la última versión que arranca sin cuenta ni token (research §1) | `latest` exige token: cada persona que clone el repo necesitaría cuenta en LocalStack |
| Carpeta `localstack/ready.d/` y `.gitattributes` | La cola y los buckets tienen que existir al arrancar; el `.sh` necesita fin de línea LF aunque se clone en Windows | Crearlos a mano en cada máquina no cumple "un comando" (SC-007a) |
| Dependencias `@aws-sdk/client-sqs` y `@aws-sdk/client-s3` | Son el cliente oficial de SQS y S3, y el mismo código sirve para LocalStack y AWS | Llamar a la API HTTP de AWS a mano obliga a firmar los pedidos (SigV4): mucho más código y más frágil |
| Dependencia `@fastify/multipart` | Fastify no interpreta `multipart/form-data` | Interpretarlo a mano es más largo y más frágil |
| `shared/infrastructure/aws/createAwsClients.ts` (no está en el árbol) | Un solo lugar arma región, endpoint y path style, igual que `createPrismaClient` | Que cada clase arme su cliente repite la configuración y complica los tests de integración |
| `CsvHeader` en `domain/value-objects/` (no está en el árbol) | La regla del encabezado es del negocio y la comparten la subida y el parser del 004 (FR-003a) | Ponerla en `CsvParserService` adelanta un servicio del spec 004 |
| `try/catch` en `CreateUploadCommandHandler` alrededor de `publish` | Decidir qué pasa si no se puede encolar (marcar FAILED) es una regla del caso de uso (FR-008a). Se relanza el error para que lo traduzca el manejador central | Sin capturarlo, el upload quedaría en PENDING para siempre |
| `IMessageConsumer` e `IFileStorage.read` un spec antes de usarse | Son la otra mitad de cada contrato, US3 los pide, y `read` permite testear `save` | Dejarlos para el 005 parte el diseño de la cola en dos specs |
| Campos `headers` y `file` en `IHttpRequest` | El controller recibe el archivo y la clave sin conocer Fastify | Pasarle el request de Fastify rompe el desacople del spec 001 |
| Carpeta `tests/support/` | Dobles y configuración compartidos por varios tests | Repetirlos en cada archivo de test |
| `202` en lugar de `201` | Dice "aceptado, sin procesar" (research §12) | `201` es válido, pero no distingue recibido de terminado |

## Fuera de este plan

Detectado al revisar el repositorio y no incluido, para no mezclar cambios:

- **Puerto de la API:** el valor por defecto es 3000, el mismo que usa Next.js. Conviene
  cambiarlo a 3001 antes del spec del frontend.
- **`.gitignore`:** la línea `uploads/` era para guardar archivos en disco, que ya no se usa.
  No molesta; se puede sacar en la limpieza final.
- **Mensaje del 413 en inglés** (`request file too large`): se podría traducir en el
  manejador central. Se deja como está porque cumple el escenario 6 de US1.
- **`USO-DE-IA.md`:** registrar que el spec y el plan se hicieron con Claude Code, que una
  sesión paralela generó un primer plan con disco y Postgres que se descartó, y la prueba
  previa contra LocalStack (incluido el hallazgo del token desde marzo de 2026).
