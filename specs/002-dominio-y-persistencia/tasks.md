---

description: "Lista de tareas del spec 002-dominio-y-persistencia"
---

# Tasks: Dominio y persistencia

**Input**: Documentos de diseño en `specs/002-dominio-y-persistencia/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/repositories.md](contracts/repositories.md),
[quickstart.md](quickstart.md)

**Tests**: TDD con Jest (principio III de la constitución y FR-017). Cada pieza con lógica
tiene primero su test, que DEBE fallar, y después la implementación. Los tests de dominio y de
mappers van en el proyecto `unit` (sin base). Los de repositorios van en `integration`, contra
`TEST_DATABASE_URL`.

**Commits**: un commit por tarea o por par test + implementación, siempre con la suite en
verde.

**Organization**: tareas agrupadas por historia de usuario del spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1, US2, US3)
- Rutas relativas a la raíz del repositorio. `DP` = `backend/src/document-processing`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: scripts de migraciones y de tests, y la base de tests configurada.

- [X] T001 Agregar `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/document_processing_test` a `backend/.env.example` y la misma línea al `backend/.env` local (no versionado).
- [X] T002 Convertir `backend/jest.config.js` en dos `projects`:
  - `unit`: `displayName: "unit"`, `preset: "ts-jest"`, `testEnvironment: "node"` y `roots: ["<rootDir>/tests/unit", "<rootDir>/tests/http"]`.
  - `integration`: `displayName: "integration"`, mismo preset y entorno, `roots: ["<rootDir>/tests/integration"]`, `setupFiles: ["dotenv/config"]` y `globalSetup: "<rootDir>/tests/integration/globalSetup.ts"`.

  En `backend/package.json` agregar los scripts `test:unit` (el mismo comando que `test` + `--selectProjects unit`) y `test:integration` (+ `--selectProjects integration`). Verificar que `npm run test:unit` sigue en 24/24 verde.
- [X] T003 [P] En `backend/prisma.config.ts` agregar `migrations: { path: "src/document-processing/infrastructure/persistence/models/migrations" }`. En `backend/package.json` agregar los scripts `db:migrate` (`prisma generate && prisma migrate dev`: `generate` va primero para que `npm run db:migrate -- --name x` le pase el nombre a `migrate dev`) y `db:deploy` (`prisma migrate deploy`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: clases base del dominio, schema con su migración e infraestructura de tests de
integración.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

- [X] T004 [P] Test de `ValueObject` en `backend/tests/unit/shared/domain/ValueObject.test.ts` con una subclase de prueba: `value` devuelve lo que se pasó; `equals` da `true` para dos instancias con el mismo valor y `false` para valores distintos. Verificar que falla.
- [X] T005 Implementar `backend/src/shared/domain/ValueObject.ts`: clase abstracta `ValueObject<T>` con `protected constructor(readonly value: T)` y `equals(other: ValueObject<T>): boolean`, que compara `value`. T004 en verde.
- [X] T006 [P] Crear `backend/src/shared/domain/AggregateRoot.ts`: clase abstracta con `protected constructor(readonly id: string)`. Sin lógica, sin test.
- [X] T007 Completar `DP/infrastructure/persistence/models/schema.prisma` según data-model.md:
  - `enum UploadStatus { PENDING PROCESSING COMPLETED FAILED }`.
  - `model Upload`: los campos de la consigna, con `status UploadStatus` y la relación `activityData ActivityData[]`.
  - `model ActivityData`: los campos de la consigna, con `date DateTime @db.Date`, la relación con `Upload` y `@@index([uploadId])`.

  Con la base de desarrollo levantada, correr `npm run db:migrate -- --name init`. Verificar que se creó `DP/infrastructure/persistence/models/migrations/<timestamp>_init/migration.sql` con `CREATE TYPE "UploadStatus" AS ENUM`, la columna `"date" DATE` y el índice, y que `psql ... -c "\dt"` muestra `Upload` y `ActivityData`.
- [ ] T008 Crear la infraestructura de integración:
  - `backend/tests/integration/globalSetup.ts`: carga `dotenv/config`, falla con un mensaje claro si falta `TEST_DATABASE_URL`, y corre `npx prisma migrate deploy` con `execSync`, `cwd` en `backend/` y `env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }`. Si falla, el mensaje sugiere `docker compose up -d --wait`.
  - `backend/tests/integration/testPrismaClient.ts`: exporta `createTestPrismaClient()`, que llama a `createPrismaClient(process.env.TEST_DATABASE_URL)`.

  Verificar con un test humo temporal en `backend/tests/integration/smoke.test.ts` (`SELECT 1` contra la base de tests) que `npm run test:integration` crea `document_processing_test` y pasa. Borrar el test humo después. Si Jest no transforma `globalSetup.ts`, pasarlo a `.js` y documentarlo en research.md.

**Checkpoint**: migración creada, la base de tests se prepara sola y `npm test` está en verde.

---

## Phase 3: User Story 1 - Ciclo de vida de un upload (Priority: P1) 🎯 MVP

**Goal**: las reglas de nombre y de estado viven en el dominio y rechazan lo inválido con
`Either`.

**Independent Test**: `npm run test:unit`, sin base (quickstart.md, paso 2).

### Tests and implementation for User Story 1 ⚠️

> Cada test se escribe PRIMERO y se verifica que FALLA antes de implementar.

- [ ] T009 [P] [US1] Test de `FileName` en `backend/tests/unit/document-processing/domain/value-objects/FileName.test.ts`:
  - Se aceptan `"datos.csv"`, `"DATOS.CSV"` y `"  datos.csv  "` (este último queda como `"datos.csv"`).
  - Se rechazan con `ValidationError` `""`, `"   "`, `"datos.txt"`, `"datos"` y `".csv"`.
- [ ] T010 [US1] Implementar `DP/domain/value-objects/FileName.ts`: extiende `ValueObject<string>`, con constructor privado y `static create(raw: string): Either<ValidationError, FileName>`. Recorta el nombre, exige "no vacío", `/\.csv$/i` y al menos un carácter antes de `.csv`. Mensajes en español. T009 en verde.
- [ ] T011 [P] [US1] Test de `UploadStatus` en `backend/tests/unit/document-processing/domain/value-objects/UploadStatus.test.ts`:
  - Recorre la matriz completa de 4×4 de data-model.md con `canTransitionTo` y verifica cada una de las 16 combinaciones, incluida PROCESSING → PROCESSING permitida.
  - `UploadStatus.from("COMPLETED").equals(UploadStatus.COMPLETED)` es `true`.
- [ ] T012 [US1] Implementar `DP/domain/value-objects/UploadStatus.ts`:
  - Tipo `UploadStatusValue = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"`.
  - Clase que extiende `ValueObject<UploadStatusValue>`, con instancias estáticas `PENDING`, `PROCESSING`, `COMPLETED` y `FAILED`, y `static from(value: UploadStatusValue)`.
  - Tabla privada `Record<UploadStatusValue, UploadStatusValue[]>` con las transiciones permitidas y `canTransitionTo(next: UploadStatus): boolean`.

  T011 en verde.
- [ ] T013 [US1] Test de `Upload` en `backend/tests/unit/document-processing/domain/entities/Upload.test.ts`, con los escenarios 1 a 10 de US1 del spec:
  - `create` con un `FileName` válido, `fileUrl` no vacío y `userId: "user-123"` da un upload PENDING, con `id` no vacío, conteos y `errorMessage` en `null`, y `createdAt === updatedAt`.
  - `create` con `fileUrl` vacío da `left`.
  - Transiciones:
    - PENDING → `markAsProcessing` da PROCESSING.
    - PROCESSING → `markAsProcessing` (reintento) se acepta.
    - PROCESSING → `markAsCompleted({ totalRows: 10, processedRows: 8, failedRows: 2 })` da COMPLETED con esos conteos.
    - PROCESSING → `markAsFailed("archivo ilegible")` da FAILED con ese mensaje.
  - Se rechazan sin modificar el upload:
    - PENDING → completed o failed;
    - COMPLETED o FAILED → cualquier transición;
    - `markAsFailed("")`;
    - conteos que no cierran (8 + 1 ≠ 10), negativos o no enteros.
  - `updatedAt` cambia en cada transición válida.
- [ ] T014 [US1] Implementar `DP/domain/entities/Upload.ts`:
  - Extiende `AggregateRoot` y tiene un tipo `UploadProps` con los campos de data-model.md.
  - `static create({ fileName, fileUrl, userId })` genera el id con `randomUUID()` de `node:crypto`.
  - `static restore(props)` reconstruye sin validar.
  - Getters de solo lectura.
  - `markAsProcessing()`, `markAsCompleted(counts)` y `markAsFailed(message)` devuelven `Either<ValidationError, void>`, usan `status.canTransitionTo` y validan antes de modificar.

  T013 en verde.

**Checkpoint**: US1 completa. Reglas de dominio probadas sin base.

---

## Phase 4: User Story 2 - Guardar y recuperar uploads (Priority: P2)

**Goal**: un upload se guarda, se actualiza y se recupera igual, con sus reglas intactas.

**Independent Test**: `npm run test:integration` (quickstart.md, paso 3).

### Tests and implementation for User Story 2 ⚠️

- [ ] T015 [US2] Crear `DP/domain/repositories/IUploadRepository.ts` con `save(upload: Upload): Promise<void>` y `findById(id: string): Promise<Upload | null>` (contracts/repositories.md).
- [ ] T016 [P] [US2] Test de `PrismaUploadMapper` en `backend/tests/unit/document-processing/infrastructure/persistence/mappers/PrismaUploadMapper.test.ts`:
  - `toDomain(toPersistence(upload))` conserva todos los campos.
  - Un registro con `status: "COMPLETED"` da un `Upload` cuyo `status.equals(UploadStatus.COMPLETED)`.

  Usa el tipo `Upload` generado por Prisma para el registro, sin base. Verificar que falla.
- [ ] T017 [US2] Implementar `DP/infrastructure/persistence/mappers/PrismaUploadMapper.ts` con `static toDomain(record)` (vía `Upload.restore`, con `FileName` y `UploadStatus.from`) y `static toPersistence(upload)`. Sin `as`. T016 en verde.
- [ ] T018 [US2] Test de integración en `backend/tests/integration/document-processing/PrismaUploadRepository.test.ts`, usando `createTestPrismaClient()`:
  - guardar y leer da los mismos valores;
  - PENDING → PROCESSING, guardar y leer: el estado es PROCESSING y `updatedAt > createdAt`;
  - COMPLETED con conteos se lee con esos conteos;
  - `findById` de un uuid inexistente y de `"abc"` devuelve `null`;
  - a un upload leído en COMPLETED, `markAsProcessing()` le devuelve `left`.

  Verificar que falla.
- [ ] T019 [US2] Implementar `DP/infrastructure/persistence/repositories/PrismaUploadRepository.ts`: implementa `IUploadRepository` y recibe `prismaClient` por constructor. `save` usa `upsert` por `id` con el mapper; `findById` usa `findUnique` y el mapper, o devuelve `null`. T018 en verde.
- [ ] T020 [US2] Test del contenedor en `backend/tests/unit/main/container.test.ts`: `buildContainer(config).resolve("uploadRepository")` es instancia de `PrismaUploadRepository`. No necesita base, porque la conexión es perezosa. Verificar que falla.
- [ ] T021 [US2] Crear `DP/infrastructure/dependency-injection/DocumentProcessingModule.ts` con `registerDocumentProcessingModule(container: AwilixContainer)`, que registra `uploadRepository: asClass(PrismaUploadRepository).singleton()`, y llamarla desde `backend/src/main/container.ts`. T020 en verde.

**Checkpoint**: US1 y US2 completas.

---

## Phase 5: User Story 3 - Datos de actividad de un upload (Priority: P3)

**Goal**: las filas válidas se crean validadas, se guardan en lote reemplazando las anteriores
y se leen por upload.

**Independent Test**: `npm run test:integration` (quickstart.md, paso 3).

### Tests and implementation for User Story 3 ⚠️

- [ ] T022 [P] [US3] Test de `ActivityData` en `backend/tests/unit/document-processing/domain/entities/ActivityData.test.ts`:
  - Acepta `{ category: "Electricity", amount: 150.5, unit: "kWh", date: "2024-01-15" }`, con id generado.
  - Recorta categoría y unidad.
  - Rechaza con `ValidationError` categoría o unidad vacía o solo espacios, `amount` 0, negativo, `NaN` o `Infinity`, y fechas `"2024-02-31"`, `"2024-13-01"`, `"15/01/2024"` y `""`.
  - Acepta `"2024-02-29"` (año bisiesto).
- [ ] T023 [US3] Implementar `DP/domain/entities/ActivityData.ts`:
  - `static create({ uploadId, category, amount, unit, date }): Either<ValidationError, ActivityData>`, con id de `randomUUID()`.
  - Una función privada `isValidCalendarDate` que exige `/^\d{4}-\d{2}-\d{2}$/` y que `Date.UTC` reconstruya el mismo año, mes y día.
  - `static restore(props)` y getters de solo lectura.

  T022 en verde.
- [ ] T024 [US3] Crear `DP/domain/repositories/IActivityDataRepository.ts` con `saveForUpload(uploadId: string, rows: ActivityData[]): Promise<void>` y `findByUploadId(uploadId: string): Promise<ActivityData[]>`.
- [ ] T025 [P] [US3] Test de `PrismaActivityDataMapper` en `backend/tests/unit/document-processing/infrastructure/persistence/mappers/PrismaActivityDataMapper.test.ts`:
  - `toPersistence` convierte `"2024-01-15"` en `new Date("2024-01-15T00:00:00.000Z")`.
  - `toDomain` de ese `Date` devuelve `"2024-01-15"`.
  - La ida y vuelta conserva todos los campos.

  Verificar que falla.
- [ ] T026 [US3] Implementar `DP/infrastructure/persistence/mappers/PrismaActivityDataMapper.ts`. Escribe la fecha con `new Date(date)` y la lee con `toISOString().slice(0, 10)` (research.md §2). T025 en verde.
- [ ] T027 [US3] Test de integración en `backend/tests/integration/document-processing/PrismaActivityDataRepository.test.ts`, escenarios 3 a 7 de US3:
  - 5 filas se guardan y se leen iguales, con la fecha como el mismo día;
  - un upload sin filas devuelve `[]`;
  - un upload inexistente hace que `saveForUpload` rechace y deja 0 filas;
  - las filas de un upload no aparecen al leer las de otro;
  - 5 filas y después 3 dejan exactamente 3;
  - 1.000 filas se guardan en menos de 2000 ms y se leen en menos de 1000 ms (SC-004).

  Verificar que falla.
- [ ] T028 [US3] Implementar `DP/infrastructure/persistence/repositories/PrismaActivityDataRepository.ts`. `saveForUpload` hace `prismaClient.$transaction([deleteMany({ where: { uploadId } }), createMany({ data: rows.map(toPersistence) })])`; `findByUploadId` usa `findMany` y el mapper. T027 en verde.
- [ ] T029 [US3] Ampliar `backend/tests/unit/main/container.test.ts` para que `activityDataRepository` sea instancia de `PrismaActivityDataRepository` (debe fallar), y registrarlo en `DP/infrastructure/dependency-injection/DocumentProcessingModule.ts`.

**Checkpoint**: las tres historias completas. `npm test` en verde.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T030 Revisar que no haya `any`, casts con `as`, `.skip`/`.only` ni código comentado en `backend/src` y `backend/tests` (`git grep`, como en el 001), y que `domain` no importe Prisma (`git grep -n "prisma" backend/src/document-processing/domain` vacío).
- [ ] T031 [P] Actualizar `README.md`:
  - Estado: el 002 completo.
  - "Cómo levantarlo": agregar `npm run db:deploy`.
  - Scripts: `db:migrate`, `db:deploy`, `test:unit` y `test:integration` (este último necesita Docker).
  - Una sección "Modelo de datos" con las dos tablas, el enum y la tabla de transiciones (con link a data-model.md).
  - Los nuevos desvíos del schema de la consigna (enum, `@db.Date`, índice) con su porqué.
- [ ] T032 [P] Actualizar la sección "Cómo se ejecuta" de `CLAUDE.md`: reemplazar `npx prisma migrate dev` por `npm run db:deploy` y mencionar `npm run db:migrate` para cambios de schema y los scripts de test.
- [ ] T033 [P] Actualizar `USO-DE-IA.md` con la etapa del spec 002:
  - las decisiones discutidas (reintento idempotente por `uploadId`, validación en la API frente al worker, idempotency key);
  - lo que encontró la prueba (bloqueo de `migrate reset` para agentes de IA, `generate` separado en Prisma 7, fechas en distintas zonas horarias);
  - en "¿Qué Aprendí?", espacio para que el autor complete idempotencia y DDD (aggregate root, value objects).
- [ ] T034 Recorrer `specs/002-dominio-y-persistencia/quickstart.md` completo, incluida una base de tests inexistente (borrarla primero con `DROP DATABASE IF EXISTS document_processing_test`), y confirmar SC-001 a SC-006.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)** → **US3 (5)** → **Polish (6)**.
- Un solo desarrollador: fases en orden y una historia por vez.

### User Story Dependencies

- **US1**: solo Foundational (`ValueObject`, `AggregateRoot`). No necesita base.
- **US2**: necesita `Upload` (US1) y la migración (T007).
- **US3**: necesita uploads guardados (US2) para los tests de integración. `ActivityData`
  (T022 y T023) se puede hacer apenas termina Foundational.

### Within Each User Story

- Test que falla → implementación → verde → commit del par.
- Value objects → entidad → interfaz de repositorio → mapper → repositorio → registro en el
  contenedor.

### Parallel Opportunities

- Setup: T003 en paralelo con T002.
- Foundational: T004 y T006.
- US1: T009 y T011 (value objects distintos).
- US2: T016 en paralelo con T015.
- US3: T022 y T025.
- Polish: T031, T032 y T033.

---

## Parallel Example: User Story 1

```text
Task: "T009 Test de FileName en backend/tests/unit/document-processing/domain/value-objects/FileName.test.ts"
Task: "T011 Test de UploadStatus en backend/tests/unit/document-processing/domain/value-objects/UploadStatus.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup y Foundational: la migración aplicada y la base de tests lista.
2. US1: las reglas de dominio en verde, sin base.
3. **Parar y validar**: `npm run test:unit`.

### Incremental Delivery

1. US1 → reglas de negocio.
2. US2 → uploads persistidos.
3. US3 → filas persistidas e idempotentes.
4. Polish → documentación y quickstart desde cero.

---

## Notes

- `DP` abrevia `backend/src/document-processing`.
- Verificar que cada test falla antes de implementar.
- No usar `prisma migrate reset`: Prisma lo bloquea cuando lo corre un agente de IA, y no hace
  falta (research.md §5).
