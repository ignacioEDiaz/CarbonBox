---

description: "Lista de tareas del spec 001-base-del-proyecto"
---

# Tasks: Base del proyecto

**Input**: Documentos de diseño en `specs/001-base-del-proyecto/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/http-api.md](contracts/http-api.md),
[quickstart.md](quickstart.md)

**Tests**: TDD con Jest (principio III de la constitución). Cada pieza con lógica tiene
primero una tarea de test, que DEBE fallar al correr `npm test`, y después la tarea de
implementación que la pone en verde.

**Commits**: un commit atómico por tarea o por par test + implementación. Un test en rojo no
se commitea solo: se commitea junto con la implementación que lo pone en verde, para que
ningún commit deje la suite rota.

**Organization**: tareas agrupadas por historia de usuario del spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1, US2, US3)
- Todas las rutas son relativas a la raíz del repositorio

## Path Conventions

- Backend: `backend/src/`; tests: `backend/tests/unit/` (misma estructura que `src/`) y
  `backend/tests/http/` (`fastify.inject`)
- `docker-compose.yml` en la raíz

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: base de datos en Docker y proyecto backend con TypeScript, Jest y Prisma

- [X] T001 Crear `docker-compose.yml` en la raíz con un único servicio `postgres`: imagen `postgres:15-alpine`, `POSTGRES_DB=document_processing`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`, puerto `5432:5432`, volumen nombrado `postgres_data:/var/lib/postgresql/data` y `healthcheck` con `pg_isready -U postgres -d document_processing` (intervalo 5s, 10 reintentos). Sin la clave `version:`. Verificar con `docker compose up -d --wait` que el contenedor queda `healthy`.
- [X] T002 Crear `backend/package.json` (`"private": true`, `"type": "commonjs"`, `"engines": { "node": ">=24" }`) con los scripts `dev` (`tsx watch src/main/index.ts`), `test` (`jest`), `test:watch` (`jest --watch`) y `typecheck` (`tsc --noEmit`), e instalar con versión exacta (`--save-exact`). Dependencias: `fastify@5.12.5`, `awilix@13.0.5`, `convict@6.2.5`, `dotenv@18.0.7`, `@prisma/client@7.10.0`, `@prisma/adapter-pg@7.10.0`. Desarrollo: `prisma@7.10.0`, `typescript@6.0.3`, `tsx@4.23.15`, `jest@30.5.2`, `ts-jest@29.4.14`, `@types/jest@30.0.0`, `@types/node@24`, `@types/convict@6.1.6`.
- [X] T003 [P] Crear `backend/tsconfig.json` con `target: ES2023`, `module: commonjs`, `moduleResolution: bundler`, `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`, `noEmit: true`, `types: ["node", "jest"]` e `include: ["src", "tests", "prisma.config.ts"]` (ver research.md §1 para el porqué de cada opción).
- [X] T004 [P] Crear `backend/jest.config.js` con `preset: "ts-jest"`, `testEnvironment: "node"` y `roots: ["<rootDir>/tests"]`.
- [X] T005 [P] Crear `backend/.env.example` con `PORT=3000` y `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/document_processing`, y agregar `backend/src/generated/` al `.gitignore` de la raíz.
- [X] T006 Crear el schema de Prisma en `backend/src/document-processing/infrastructure/persistence/models/schema.prisma`, solo con `generator client { provider = "prisma-client", output = "../../../../generated/prisma" }` y `datasource db { provider = "postgresql" }`, sin modelos. Crear `backend/prisma.config.ts` con `import "dotenv/config"` y `defineConfig({ schema: <esa ruta>, datasource: { url: env("DATABASE_URL") } })`. Agregar el script `postinstall: "prisma generate"` a `backend/package.json`. Copiar `.env.example` a `.env` y verificar que `npx prisma generate` crea `backend/src/generated/prisma/client.ts`.
- [X] T007 Crear un test humo en `backend/tests/unit/smoke.test.ts` y verificar que `npm test` y `npm run typecheck` pasan. Borrar el test humo después de verificar.

**Checkpoint**: la base levanta y el proyecto compila y corre tests.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: piezas que necesitan las tres historias: `Either`, contratos, `BaseController`,
configuración (camino feliz), cliente Prisma, contenedor y arranque.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

- [X] T008 [P] Test de `Either` en `backend/tests/unit/shared/domain/Either.test.ts`: `Either.right(5)` cumple `isRight() === true`, `isLeft() === false` y `value === 5`; `Either.left(new Error("x"))` cumple `isLeft() === true` y `value` es ese error. Correr `npm test` y verificar que falla.
- [X] T009 Implementar `backend/src/shared/domain/Either.ts` según data-model.md: clases `Left` y `Right` con `readonly value` y los type guards `isLeft()`/`isRight()`, el tipo `Either<L, R> = Left<L, R> | Right<L, R>` y el objeto `Either` con `left()` y `right()`. T008 en verde.
- [X] T010 [P] Crear `backend/src/shared/application/ICommandHandler.ts` e `IQueryHandler.ts` con `execute(command|query): Promise<Either<Error, TResult>>`, tal como en data-model.md. Son solo interfaces, no llevan test.
- [X] T011 [P] Crear `backend/src/shared/infrastructure/http/IHttpRequest.ts` (`params`, `query` y `body`, los tres `unknown`) e `IHttpResponse.ts` (`statusCode: number`, `body: unknown`).
- [X] T012 Test de `BaseController` en `backend/tests/unit/shared/infrastructure/http/BaseController.test.ts`, usando una subclase de prueba: `respond(Either.right(x))` devuelve `{ statusCode: 200, body: x }`; `respond(Either.right(x), 201)` devuelve `statusCode: 201`; `respond(Either.left(error))` lanza ese mismo error. Verificar que falla.
- [X] T013 Implementar `backend/src/shared/infrastructure/http/BaseController.ts`: clase abstracta con `abstract handle(request: IHttpRequest): Promise<IHttpResponse>` y `protected respond<T>(result: Either<Error, T>, statusCode = 200): IHttpResponse`, que lanza `result.value` si es `left`. T012 en verde.
- [ ] T014 Implementar `backend/src/shared/infrastructure/http/adaptRoute.ts`: `adaptRoute(controller: BaseController)` devuelve un handler de Fastify que arma `IHttpRequest` desde `request.params/query/body`, llama a `controller.handle` y responde con `reply.status(statusCode).send(body)`. Sin `try/catch`: los errores suben al manejador de Fastify. Se prueba con los tests HTTP de US1.
- [ ] T015 [P] Test de configuración en `backend/tests/unit/config/config.test.ts`: `loadConfig({ PORT: "4000", DATABASE_URL: "postgresql://u:p@h:5432/db" })` devuelve `port === 4000` (número) y `database.url` igual a la URL; sin `PORT`, `port === 3000`. Verificar que falla.
- [ ] T016 Implementar `backend/src/config/IConvictProps.ts` (`port: number`, `database: { url: string }`) y `backend/src/config/index.ts` con `loadConfig(env: NodeJS.ProcessEnv = process.env): IConvictProps`, que arma el schema de Convict (`port`: formato `port`, default `3000`, env `PORT`; `database.url`: env `DATABASE_URL`, `sensitive: true`), lo crea con `convict(schema, { env })`, corre `validate({ allowed: "strict" })` y devuelve `getProperties()`. T015 en verde.
- [ ] T017 [P] Implementar `backend/src/shared/infrastructure/persistence/createPrismaClient.ts`: `createPrismaClient(databaseUrl: string)` devuelve `new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })`, importando `PrismaClient` desde `../../../generated/prisma/client`. No llama a `$connect()`: la conexión es perezosa (research.md §6).
- [ ] T018 Implementar `backend/src/main/container.ts`: `buildContainer(config: IConvictProps)` crea un contenedor de Awilix con `injectionMode: InjectionMode.CLASSIC` y `strict: true`, y registra `config` y `prismaClient` (a partir de `createPrismaClient(config.database.url)`) con `asValue`.
- [ ] T019 Implementar `backend/src/main/App.ts`: clase `App` que recibe el contenedor por constructor, crea Fastify con `logger: true`, expone `server` (para `inject` en los tests), un método `listen(port)` y un hook `onClose` que llama a `prismaClient.$disconnect()`.
- [ ] T020 Implementar `backend/src/main/index.ts`: `import "dotenv/config"`, `loadConfig()`, `buildContainer(config)`, `new App(container)`, `app.listen(config.port)`, y cierre ordenado con `app.server.close()` ante `SIGINT`/`SIGTERM`. Verificar que `npm run dev` arranca y escucha en el puerto 3000, y que `npm test` y `npm run typecheck` pasan.

**Checkpoint**: el servicio arranca, las piezas base tienen tests en verde y las historias
pueden empezar.

---

## Phase 3: User Story 1 - Levantar el entorno y verificar que está sano (Priority: P1) 🎯 MVP

**Goal**: `GET /health` informa el estado del servicio y de la base: 200 si la base responde,
503 si no, sin que el servicio se caiga.

**Independent Test**: quickstart.md, pasos 1, 3, 4 y 5.

### Tests for User Story 1 ⚠️

> Escribir estos tests PRIMERO y verificar que FALLAN antes de implementar.

- [ ] T021 [P] [US1] Test de `GetHealthQueryHandler` en `backend/tests/unit/health/application/GetHealthQueryHandler.test.ts`, con un doble de `IDatabaseHealthChecker`: si `isUp()` resuelve `true`, `execute(new GetHealthQuery())` devuelve un `right` con `{ service: "up", database: "up" }`; si resuelve `false`, un `right` con `{ service: "up", database: "down" }`.
- [ ] T022 [P] [US1] Test de `HealthController` en `backend/tests/unit/health/presentation/HealthController.test.ts`, con un doble del handler: con la base `"up"`, `handle()` devuelve `statusCode: 200` y el body del handler; con `"down"`, devuelve `statusCode: 503` y el mismo body.

### Implementation for User Story 1

- [ ] T023 [US1] Crear `backend/src/health/application/GetHealthQuery.ts` (clase vacía), `IDatabaseHealthChecker.ts` (`isUp(): Promise<boolean>`) y `GetHealthQueryHandler.ts`, que implementa `IQueryHandler<GetHealthQuery, HealthStatus>`, recibe `databaseHealthChecker` por constructor y exporta el tipo `HealthStatus = { service: "up"; database: "up" | "down" }`. T021 en verde.
- [ ] T024 [US1] Crear `backend/src/health/presentation/HealthController.ts`: extiende `BaseController`, recibe `getHealthQueryHandler` por constructor y usa `respond(result, 200)` o `503` según `database`. T022 en verde.
- [ ] T025 [US1] Crear `backend/src/health/infrastructure/PrismaDatabaseHealthChecker.ts`, que implementa `IDatabaseHealthChecker` y recibe `prismaClient` por constructor: `isUp()` corre `prismaClient.$queryRaw\`SELECT 1\`` contra un timeout de 2000 ms con `Promise.race`, devuelve `true` si responde a tiempo y `false` si falla o se agota el tiempo, nunca lanza y limpia el timer. Se verifica a mano en T028 (plan.md, Testing).
- [ ] T026 [US1] Test HTTP en `backend/tests/http/health.test.ts`: armar `App` con un contenedor donde `databaseHealthChecker` es un doble (`asValue`) y verificar con `app.server.inject({ method: "GET", url: "/health" })` que devuelve 200 con `{"service":"up","database":"up"}` y 503 con `{"service":"up","database":"down"}`, según el contrato en contracts/http-api.md. Verificar que falla (todavía no hay ruta).
- [ ] T027 [US1] Registrar `databaseHealthChecker` (`PrismaDatabaseHealthChecker`), `getHealthQueryHandler` y `healthController` con `asClass(...).singleton()` en `backend/src/main/container.ts`, y la ruta `GET /health` con `adaptRoute(container.resolve("healthController"))` en `backend/src/main/App.ts`. T026 en verde.
- [ ] T028 [US1] Verificación manual con la base real, siguiendo quickstart.md pasos 1, 3, 4 y 5: 200 con la base arriba (< 1 s), 503 con la base detenida (< 5 s) sin que se caiga el servicio, de nuevo 200 al reiniciar la base sin reiniciar el servicio, y los datos persisten tras `docker compose down` + `up`.

**Checkpoint**: US1 funciona y se puede demostrar sola (MVP).

---

## Phase 4: User Story 2 - Configurar el servicio por entorno (Priority: P2)

**Goal**: si falta un valor obligatorio o tiene un formato inválido, el servicio no arranca y
el mensaje dice qué valor es, sin mostrar secretos.

**Independent Test**: quickstart.md, pasos 2 y 6.

### Tests for User Story 2 ⚠️

- [ ] T029 [P] [US2] Ampliar `backend/tests/unit/config/config.test.ts`: `loadConfig` sin `DATABASE_URL` lanza un error cuyo mensaje contiene `database.url`; con `DATABASE_URL=""` también; con `PORT: "abc"` lanza un error cuyo mensaje contiene `port`; y cuando falla por `PORT` con una `DATABASE_URL` válida que contiene la contraseña `secreta`, el mensaje NO contiene `secreta`. Verificar que fallan.

### Implementation for User Story 2

- [ ] T030 [US2] En `backend/src/config/index.ts`, agregar con `convict.addFormat` un formato `required-string` que rechaza valores que no son string o están vacíos, y usarlo en `database.url` (default `""`). T029 en verde.
- [ ] T031 [US2] En `backend/src/main/index.ts`, capturar el error de `loadConfig()` y terminar con `process.exit(1)` después de imprimir `Configuración inválida:` seguido del mensaje de Convict. Capturar el error `EADDRINUSE` de `listen` e imprimir `El puerto <port> ya está en uso` antes de `process.exit(1)`. Es el único lugar con `try/catch` y no es un controller: es el arranque del proceso.
- [ ] T032 [US2] Verificación manual siguiendo quickstart.md pasos 2 y 6: arranque con `.env` copiado de `.env.example`; sin `DATABASE_URL`; con `PORT=abc`; con el puerto ocupado. Restaurar `.env` al terminar.

**Checkpoint**: US1 y US2 funcionan.

---

## Phase 5: User Story 3 - Piezas compartidas para los specs siguientes (Priority: P3)

**Goal**: todo error responde con `{ error: { type, message } }` y el código acorde, y los
errores inesperados no exponen detalles internos.

**Independent Test**: `npm test`, más quickstart.md paso 7.

### Tests for User Story 3 ⚠️

- [ ] T033 [P] [US3] Crear `backend/src/shared/domain/errors.ts` con `ValidationError` y `NotFoundError` (extienden `Error` y fijan `name`; sin lógica). Escribir el test de `toHttpError` en `backend/tests/unit/shared/infrastructure/http/errorHandler.test.ts` con estos casos:
  - `ValidationError("x")` → `{ statusCode: 400, body: { error: { type: "VALIDATION_ERROR", message: "x" } } }`.
  - `NotFoundError("x")` → 404 `NOT_FOUND`.
  - Un error con `statusCode: 415` (como los de Fastify) → 415 `VALIDATION_ERROR`.
  - `new Error("detalle secreto")` → 500 `INTERNAL_ERROR` con el mensaje `"Error interno del servidor"`, sin "detalle secreto".

  Verificar que falla.
- [ ] T034 [P] [US3] Test HTTP en `backend/tests/http/errors.test.ts`:
  - `GET /no-existe` → 404 con `{"error":{"type":"NOT_FOUND","message":"Ruta GET /no-existe no encontrada"}}`.
  - Una ruta de prueba, registrada en `app.server` dentro del test, que lanza `new Error("detalle secreto")` → 500 sin "detalle secreto" en el body.
  - Una ruta de prueba con `adaptRoute` y un controller cuyo `respond` recibe `Either.left(new ValidationError("dato inválido"))` → 400 `VALIDATION_ERROR`.

  Verificar que falla.

### Implementation for User Story 3

- [ ] T035 [US3] Implementar `backend/src/shared/infrastructure/http/errorHandler.ts`:
  - La función pura `toHttpError(error: unknown)` aplica el mapeo de research.md §9.
  - `registerErrorHandlers(server: FastifyInstance)` usa `setErrorHandler`: registra el error completo con `request.log.error(error)` cuando el status es 500 y responde con `toHttpError`.
  - También usa `setNotFoundHandler` para responder 404 `NOT_FOUND` con el mensaje `Ruta <MÉTODO> <url> no encontrada`.

  T033 en verde.
- [ ] T036 [US3] Llamar a `registerErrorHandlers(this.server)` en el constructor de `backend/src/main/App.ts`, antes de registrar las rutas. T034 en verde.
- [ ] T037 [US3] Verificación manual siguiendo quickstart.md paso 7 (`curl.exe -i http://localhost:3000/no-existe`).

**Checkpoint**: las tres historias funcionan. `npm test` y `npm run typecheck` en verde.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: cerrar el spec verificado y documentado.

- [ ] T038 Revisar que no haya `any` en `backend/src` ni en `backend/tests` (`git grep -nE ":\s*any\b|<any>|as any" backend`), que no queden tests salteados (`.skip`/`.only`) y que no haya código muerto ni comentado.
- [ ] T039 [P] Crear `README.md` en la raíz con requisitos (Docker Desktop, Node 24), cómo levantar el entorno (resumen de quickstart.md), los scripts (`dev`, `test`, `test:watch`, `typecheck`), la estructura de carpetas con los agregados al árbol de la consigna y su justificación (plan.md, Complexity Tracking), y una sección "Limitaciones conocidas" vacía para completar.
- [ ] T040 [P] Actualizar `USO-DE-IA.md` con la etapa 3 (implementación del 001): qué generó la IA, qué se corrigió y qué se aprendió (en palabras del autor).
- [ ] T041 Recorrer completo `specs/001-base-del-proyecto/quickstart.md` desde un estado limpio (`docker compose down`, borrar `backend/node_modules` y `backend/.env`) y confirmar los criterios SC-001 a SC-006 del spec.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup y bloquea todas las historias.
- **US1, US2, US3 (Phases 3 a 5)**: dependen de Foundational. Se hacen en orden P1 → P2 → P3
  (un solo desarrollador, principio "un spec y una historia por vez").
- **Polish (Phase 6)**: depende de las tres historias.

### User Story Dependencies

- **US1 (P1)**: solo Foundational.
- **US2 (P2)**: solo Foundational (amplía `config` y `index.ts`). Se puede probar sin US1.
- **US3 (P3)**: solo Foundational. Toca `App.ts`, igual que US1 (T027 y T036), así que no se
  hace en paralelo con T027.

### Within Each User Story

- Test que falla → implementación → test en verde → commit del par.
- Interfaces y handler antes que controller; controller antes que registro y ruta.

### Parallel Opportunities

- Setup: T003, T004 y T005 en paralelo después de T002.
- Foundational: T008, T010, T011, T015 y T017 en paralelo (archivos distintos).
- US1: T021 y T022 en paralelo.
- US3: T033 y T034 en paralelo.
- Polish: T039 y T040 en paralelo.

---

## Parallel Example: User Story 1

```text
# Tests de US1 en paralelo (archivos distintos):
Task: "T021 Test de GetHealthQueryHandler en backend/tests/unit/health/application/GetHealthQueryHandler.test.ts"
Task: "T022 Test de HealthController en backend/tests/unit/health/presentation/HealthController.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup.
2. Phase 2: Foundational.
3. Phase 3: US1.
4. **Parar y validar**: `/health` con la base arriba y abajo (T028).

### Incremental Delivery

1. Setup + Foundational → el servicio arranca.
2. US1 → `/health` funciona (MVP).
3. US2 → los errores de configuración son claros.
4. US3 → los errores tienen un formato consistente.
5. Polish → README, USO-DE-IA y quickstart completo.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Verificar que cada test falla antes de implementar (TDD, principio III).
- Commit al terminar cada tarea o par test + implementación, con la suite en verde.
- Ante cualquier duda de diseño, la referencia es research.md (decisión, porqué y
  alternativas).
