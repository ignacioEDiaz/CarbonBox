# Tasks: Worker y procesamiento

**Input**: [spec.md](spec.md), [plan.md](plan.md). TDD: cada test se ve fallar antes de
implementar. Verificar con el código de salida de `npm run test:unit` / `npm test`.
`DP` = `backend/src/document-processing`.

## Phase 1: Foundational

- [X] T001 Mover `RowError` a `DP/domain/value-objects/RowError.ts` y que `ICsvParserService` lo importe de ahí. Tests en verde.
- [X] T002 Crear `DP/domain/repositories/IRowErrorRepository.ts` (`saveForUpload(uploadId, errors)`, `findByUploadId(uploadId)` ordenado por línea).
- [X] T003 Modelo `RowError` en `schema.prisma` (+ `Upload.rowErrors`), migración `add_row_error` generada con `prisma migrate diff`, `db:deploy` y `prisma generate`.
- [X] T004 Test de integración y `PrismaRowErrorRepository` (reemplaza en transacción, ordena por línea).
- [X] T005 Dobles `InMemoryActivityDataRepository` e `InMemoryRowErrorRepository` en `backend/tests/support/`.

## Phase 2: US1 - El archivo subido se procesa solo (P1)

- [X] T006 [US1] Test y `FileProcessingService` (+ `IFileProcessingService`): lee de storage, parsea, guarda filas y errores, devuelve `Either<ValidationError, { totalRows, processedRows, failedRows }>`.
- [X] T007 [US1] Test y `ProcessFileCommand` + `ProcessFileCommandHandler`: PROCESSING, COMPLETED con conteos, FAILED si ninguna fila válida, FAILED con el motivo del parser.
- [X] T008 [US1] Test y `src/workers/FileProcessingWorker.ts`: `processNextMessage()` → `"empty" | "processed" | "discarded"`; borra el mensaje después del handler.
- [X] T009 [US1] `src/workers/index.ts` (bucle, 3 s, SIGINT/SIGTERM, cierre de conexiones), script `worker`, registro en Awilix y test del contenedor.
- [X] T010 [US1] Test de integración: subir con la App → `processNextMessage()` → COMPLETED, filas y errores en la base, cola vacía.

## Phase 3: US2 - Ver los errores por fila (P2)

- [X] T011 [US2] Test y `GetUploadRowErrorsQuery` + handler (404 si no existe el upload).
- [X] T012 [US2] Test y `GetUploadRowErrorsController`, ruta `GET /api/v1/uploads/:id/errors` y registro.

## Phase 4: US3 - Fallas, duplicados y reintentos (P3)

- [X] T013 [US3] Tests del handler: upload inexistente (Left), ya terminado (no procesa), excepción en intentos 1-2 (sale la excepción, no queda final), excepción en el intento 3 (FAILED "No se pudo procesar después de 3 intentos"); implementar. Tests del worker: aviso sin `uploadId` → `"discarded"` y borrado; excepción del handler → no borra.
- [X] T014 [US3] DLQ en `localstack/ready.d/init-aws.sh` (`uploads-dlq`, redrive `maxReceiveCount` 3) y aplicarla al LocalStack que está corriendo.

## Phase 5: Polish

- [X] T015 Quickstart a mano: `npm run dev` + `npm run worker` + `curl` → COMPLETED; `/errors`.
- [X] T016 README, CLAUDE.md y USO-DE-IA.md.
