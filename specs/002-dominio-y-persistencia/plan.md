# Implementation Plan: Dominio y persistencia

**Branch**: `002-dominio-y-persistencia` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-dominio-y-persistencia/spec.md`

## Summary

Modelar el negocio en `domain` y guardarlo con Prisma:

- **Value objects:** `FileName` (valida `.csv`) y `UploadStatus`, con la tabla de transiciones
  que incluye el reintento PROCESSING → PROCESSING.
- **Entidades:** `Upload`, el aggregate root, con `markAsProcessing`, `markAsCompleted` y
  `markAsFailed` que devuelven `Either`; y `ActivityData`, que valida sus valores y guarda la
  fecha como `"YYYY-MM-DD"`.
- **Repositorios:** las interfaces en `domain`; las implementaciones Prisma y los mappers en
  `infrastructure`.
- **Base:** migración versionada con enum de estado, fecha `DATE` e índice por `uploadId`. El
  reemplazo de filas es idempotente, en una transacción.
- **Tests:** unitarios para el dominio, con TDD y sin base, y de integración contra una base
  de tests separada.

Ver [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`) sobre Node.js 24, CommonJS, igual que el 001.

**Primary Dependencies**: las mismas del 001 (Prisma 7.10.0 con `@prisma/adapter-pg`,
Awilix 13, Jest 30 + ts-jest). No se suma ninguna dependencia: los ids salen de
`node:crypto`.

**Storage**: PostgreSQL 15 (Docker). Dos tablas (`Upload`, `ActivityData`) y el enum
`UploadStatus`. Desarrollo en `document_processing`; tests en `document_processing_test`
(`TEST_DATABASE_URL`).

**Testing**:
- Unitarios (proyecto Jest `unit`, sin base): `FileName`, `UploadStatus`, `Upload`,
  `ActivityData`, mappers y el registro en el contenedor.
- Integración (proyecto `integration`, con base): los dos repositorios, contra la base de
  tests, migrada por un `globalSetup` con `prisma migrate deploy`.

**Target Platform**: desarrollo local en Windows con Docker Desktop.

**Project Type**: servicio web (backend). Este spec no agrega endpoints.

**Performance Goals**: 1.000 filas se guardan en menos de 2 s y se leen en menos de 1 s
(SC-004). En la prueba dio unos 350 ms y unos 22 ms.

**Constraints**:
- `domain` no importa Prisma (solo `node:crypto`).
- Las fechas no se corren por zona horaria (FR-016).
- Los tests no tocan la base de desarrollo.
- Sin `any`.

**Scale/Scope**: unos 12 archivos fuente nuevos y unos 8 de test.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple este plan | Estado |
|---|---|---|
| I. DDD + Clean + CQRS | Aggregate root `Upload`, value objects y entidades en `domain`, sin Prisma. Las transiciones viven en `Upload`/`UploadStatus` y devuelven `Either`. Interfaces de repositorio en `domain`; Prisma y los mappers en `infrastructure`; registro en Awilix. Todavía no hay commands ni queries, que llegan en el 003. | ✅ |
| II. Estructura de la consigna | `domain/entities`, `domain/value-objects`, `domain/repositories`, `infrastructure/persistence/{repositories,mappers,models}` y `dependency-injection/DocumentProcessingModule.ts`, tal cual el árbol. | ✅ con desvíos justificados |
| III. TDD | Cada value object y entidad se escribe test-first. Los repositorios tienen tests de integración (la constitución los recomienda; acá los exige FR-017). | ✅ |
| IV. Legible y mínimo | Sin dependencias nuevas. Las clases base tienen pocas líneas y se usan. Los repositorios exponen solo los 4 métodos que piden el spec y los specs siguientes. | ✅ |
| V. Punta a punta | Termina con datos reales guardados y leídos en Postgres, verificables con un comando. | ✅ |

**Re-check post diseño:** sin violaciones nuevas.

## Project Structure

### Documentation (this feature)

```text
specs/002-dominio-y-persistencia/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── repositories.md
└── tasks.md             # Lo genera /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── package.json                         # + scripts db:migrate, db:deploy, test:unit, test:integration
├── jest.config.js                       # dos projects: unit e integration (con globalSetup)
├── prisma.config.ts                     # + migrations.path
├── .env.example                         # + TEST_DATABASE_URL
├── src/
│   ├── main/container.ts                # + registerDocumentProcessingModule(container)
│   ├── shared/domain/
│   │   ├── AggregateRoot.ts
│   │   └── ValueObject.ts
│   └── document-processing/
│       ├── domain/
│       │   ├── entities/
│       │   │   ├── Upload.ts
│       │   │   └── ActivityData.ts
│       │   ├── value-objects/
│       │   │   ├── UploadStatus.ts
│       │   │   └── FileName.ts
│       │   └── repositories/
│       │       ├── IUploadRepository.ts
│       │       └── IActivityDataRepository.ts
│       └── infrastructure/
│           ├── persistence/
│           │   ├── repositories/
│           │   │   ├── PrismaUploadRepository.ts
│           │   │   └── PrismaActivityDataRepository.ts
│           │   ├── mappers/
│           │   │   ├── PrismaUploadMapper.ts
│           │   │   └── PrismaActivityDataMapper.ts
│           │   └── models/
│           │       ├── schema.prisma    # + enum, Upload, ActivityData
│           │       └── migrations/      # generada por prisma migrate dev
│           └── dependency-injection/
│               └── DocumentProcessingModule.ts
└── tests/
    ├── unit/document-processing/...     # value objects, entidades, mappers
    ├── unit/main/container.test.ts
    └── integration/
        ├── globalSetup.ts               # migrate deploy contra TEST_DATABASE_URL
        ├── testPrismaClient.ts          # cliente apuntando a la base de tests
        └── document-processing/...      # repositorios
```

**Structure Decision**: se completa el bounded context `document-processing` siguiendo el
árbol de la consigna. Los tests de integración van en `backend/tests/integration/`, separados
de los unitarios, para que `npm run test:unit` no necesite Docker.

## Complexity Tracking

| Agregado o desvío | Por qué hace falta | Alternativa más simple descartada porque |
|---|---|---|
| Enum de Postgres en lugar de `String` (schema de la consigna) | La base rechaza estados inválidos y Prisma genera el tipo exacto | Con `String`, la base aceptaría cualquier texto |
| `@db.Date` en `date` (la consigna dice `DateTime`) | Un día sin hora no se corre por zona horaria | Con `TIMESTAMP`, la fecha depende de la zona del proceso |
| Proyectos de Jest + `globalSetup` | Los tests de integración necesitan una base migrada y no deben bloquear el TDD del dominio | Un solo proyecto obligaría a tener Docker para cualquier test |
| `TEST_DATABASE_URL` y base `document_processing_test` | Los tests no tocan los datos de desarrollo | Usar la misma base mezcla datos de prueba con los reales |
| `migrations.path` en `prisma.config.ts` | Las migraciones quedan junto al schema, en la ruta de la consigna | Es la ubicación por defecto, pero declararla deja explícito dónde están |
