# Implementation Plan: Worker y procesamiento

**Branch**: `005-worker-y-procesamiento` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

## Summary

El worker de la consigna (`src/workers/FileProcessingWorker.ts`, `npm run worker`) consume SQS
con polling cada 3 s y, por cada mensaje, llama a `ProcessFileCommandHandler`. El handler maneja
el ciclo de vida del upload y delega el trabajo pesado en `FileProcessingService` (leer de S3,
parsear con `CsvParserService`, guardar filas y errores). Los errores por fila van a la tabla
nueva `RowError` y se leen con `GetUploadRowErrorsQueryHandler`. Reintentos con el visibility
timeout de SQS y DLQ con redrive policy. Diseño paso a paso: Miro, frame 7.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`), Node.js 24, CommonJS.
**Primary Dependencies**: las de los specs anteriores; ninguna nueva.
**Storage**: PostgreSQL (tabla nueva `RowError`, migración `add_row_error`), S3 y SQS en
LocalStack (cola nueva `uploads-dlq` y redrive policy en `init-aws.sh`).
**Testing**: unitarios con dobles (servicio, handler, worker, query, controller, contenedor) e
integración (`PrismaRowErrorRepository` y flujo subir → worker → COMPLETED).
**Constraints**: el worker sin lógica de negocio ni `try/catch` (constitución I): el bucle con
su `try/catch` vive en `src/workers/index.ts`, que es arranque, igual que `main/index.ts`.
**Scale/Scope**: ~12 archivos fuente nuevos, ~6 modificados, ~8 de test.

## Decisiones (research)

1. **Reparto de responsabilidades.** Worker = puerta de entrada (mensaje → command → borra o
   no). Handler = estados del upload (buscar, PROCESSING, estado final, último intento).
   `FileProcessingService` = leer, parsear y guardar; devuelve `Either` con los conteos. Así
   cada clase se prueba por separado con dobles.
2. **Resultado del worker.** `processNextMessage()` devuelve `"empty" | "processed" |
   "discarded"` y deja salir las excepciones. `workers/index.ts` hace el bucle: si es `"empty"`
   espera 3 s; si hay excepción la registra, no borra el mensaje y sigue.
3. **Errores de negocio y transitorios.** Un `Left` del handler (upload inexistente) y un
   `Right` se resuelven borrando el mensaje. Una excepción es transitoria: el mensaje queda y
   SQS lo reentrega a los 60 s con `receiveCount + 1`.
4. **Último intento.** El command lleva `attempt` (= `receiveCount`). Si el procesamiento lanza y
   `attempt >= 3`, el handler vuelve a leer el upload de la base (el de memoria puede haber
   quedado a medio cambiar) y lo marca FAILED ("No se pudo procesar después de 3 intentos").
   Si esa lectura también falla, la excepción sale, el mensaje queda y la redrive policy
   (`maxReceiveCount = 3`) lo manda a `uploads-dlq` en la siguiente entrega.
5. **`RowError` pasa a `domain`** (`domain/value-objects/RowError.ts`): lo usan el parser y la
   interfaz `IRowErrorRepository`, que vive en `domain` y no puede importar de `application`.
6. **Tabla `RowError`**: `id` autoincremental, `uploadId` (FK, índice), `line`, `message`,
   `createdAt`. `saveForUpload` borra e inserta en una transacción, como `ActivityData`.
7. **Entrega duplicada**: si el upload ya está COMPLETED o FAILED, el handler devuelve su estado
   sin procesar (idempotencia).

## Constitution Check

| Principio | Cómo lo cumple | Estado |
|---|---|---|
| I. DDD + Clean + CQRS | Command + handler para procesar, query + handler para leer errores. Handlers con `Either` y dependencias por interfaz. Estados en `Upload`. Worker sin lógica ni `try/catch`. | ✅ |
| II. Estructura | `src/workers/FileProcessingWorker.ts`, `application/services/FileProcessingService.ts`, `commands/*/ProcessFile*` como el árbol. Desvíos: `workers/index.ts` (arranque), `IFileProcessingService`, `RowError` y la query de errores. | ✅ con desvíos justificados |
| III. TDD | Cada pieza con su test primero. | ✅ |
| IV. Legible y mínimo | Sin dependencias nuevas; valores fijos (3 intentos, 3 s). | ✅ |
| V. Punta a punta | Termina con subir → worker → COMPLETED verificable con curl. | ✅ |

## Project Structure

```text
localstack/ready.d/init-aws.sh                  # + uploads-dlq y redrive policy
backend/package.json                            # + script worker
backend/src/
├── workers/
│   ├── index.ts                                # arranque y bucle de polling (nuevo)
│   └── FileProcessingWorker.ts                 # nuevo
└── document-processing/
    ├── domain/
    │   ├── value-objects/RowError.ts           # nuevo (movido desde el parser)
    │   └── repositories/IRowErrorRepository.ts # nuevo
    ├── application/
    │   ├── commands/objects/ProcessFileCommand.ts
    │   ├── commands/handlers/ProcessFileCommandHandler.ts
    │   ├── queries/objects/GetUploadRowErrorsQuery.ts
    │   ├── queries/handlers/GetUploadRowErrorsQueryHandler.ts
    │   └── services/{IFileProcessingService,FileProcessingService}.ts
    ├── infrastructure/
    │   ├── persistence/models/schema.prisma    # + RowError
    │   ├── persistence/models/migrations/<ts>_add_row_error/
    │   ├── persistence/repositories/PrismaRowErrorRepository.ts
    │   └── dependency-injection/DocumentProcessingModule.ts
    └── presentation/
        ├── controllers/GetUploadRowErrorsController.ts
        └── routes/DocumentProcessingRoutes.ts  # + GET /api/v1/uploads/:id/errors
```

## Complexity Tracking

| Agregado o desvío | Por qué | Alternativa descartada |
|---|---|---|
| `workers/index.ts` | El bucle necesita `try/catch` para no morir ante una falla transitoria, y la constitución no lo permite en el worker | `try/catch` dentro del worker |
| `IFileProcessingService` | El handler depende de interfaces (constitución I) | Depender de la clase |
| Tabla `RowError` y su query | Decisión del autor: errores por fila consultables | Meterlos en `errorMessage` |
| Releer el upload en el último intento | El de memoria puede haber quedado a medio cambiar | Marcar FAILED sobre el objeto en memoria |
