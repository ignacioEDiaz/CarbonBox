# Research: Base del proyecto

Decisiones técnicas del spec 001. Las versiones se consultaron en el registro de npm el
2026-10-10. Prisma 7, el adapter de pg, TypeScript 6, tsx, Jest con ts-jest y Awilix se
probaron juntos en un proyecto descartable, incluido un `SELECT 1` contra
`postgres:15-alpine` en Docker.

## 1. Runtime y lenguaje

- **Decisión:** Node.js 24 (LTS instalado), TypeScript 6.0.3 en modo `strict`, CommonJS.
  `tsconfig`: `module: commonjs`, `moduleResolution: bundler`,
  `types: ["node", "jest"]`.
- **Por qué:**
  - Es el Node que ya está en la máquina.
  - Se usa TS 6 y no TS 7 (el `latest`) porque `ts-jest` solo soporta `typescript <7`: TS 7 es
    el compilador nativo nuevo y todavía no expone la API que usa `ts-jest`. TS 6 es la última
    versión del compilador en JavaScript y es estable.
  - Con CommonJS no hace falta poner extensiones `.js` en los imports ni lidiar con la
    interoperabilidad ESM/CJS (Convict es CJS).
  - `moduleResolution: bundler` es la resolución no deprecada que TS 6 permite combinar con
    CommonJS. Con `nodenext`, `ts-jest` exige `isolatedModules` y en ese modo deja de chequear
    tipos (verificado en la prueba).
  - En TS 6 `types` arranca vacío por defecto, así que se declaran los de Node y Jest.
- **Alternativas:** ESM (más moderno, pero suma configuración sin aportar nada a esta prueba);
  TS 7 con `@swc/jest` (descartada en la sección 3).

## 2. Cómo se ejecuta TypeScript en desarrollo

- **Decisión:** `tsx` (`tsx watch src/main/index.ts`). `tsc --noEmit` solo para chequear tipos.
- **Por qué:** `tsx` ejecuta TS directo y reinicia al guardar. Node 24 también ejecuta `.ts`
  de forma nativa, pero solo "borra tipos": no soporta *parameter properties*
  (`constructor(private readonly repo: IRepo)`), que es justo la forma más corta de escribir
  inyección por constructor. `tsx` sí las soporta.
- **Alternativas:** `ts-node` (más lento y con más configuración); compilar con `tsc` y correr
  `node dist` (dos pasos en cada cambio).

## 3. Runner de tests

- **Decisión:** Jest 30.5.2 con `ts-jest` 29.4.14 (`preset: "ts-jest"`,
  `testEnvironment: "node"`) y `@types/jest` 30.0.0. Scripts `test` (`jest`) y `test:watch`
  (`jest --watch`) para el ciclo rojo-verde-refactor.
- **Por qué:**
  - Jest es el runner elegido para TDD. Trae `describe/it/expect` y mocks (`jest.fn()`)
    incluidos, y es el estándar más conocido en proyectos Node.
  - `ts-jest` compila cada test con el compilador de TypeScript y **chequea tipos**: un error
    de tipos hace fallar el test, no solo `tsc`. Verificado en la prueba: un
    `const n: number = "a"` hizo fallar la suite con `TS2322`.
  - Soporta *parameter properties* y `jest.fn()` sin configuración extra (verificado).
- **Ajuste descubierto al implementar (T026):** `fastify.inject()` carga
  `light-my-request`, que hace `require` de `cookie@2`, un paquete ESM puro. Node 24 lo
  resuelve solo, pero el runtime de módulos de Jest 30 lo soporta únicamente si existe
  `vm.SourceTextModule`, que Node expone con `--experimental-vm-modules`. Por eso los
  scripts corren `node --experimental-vm-modules --disable-warning=ExperimentalWarning
  node_modules/jest/bin/jest.js`. Se llama a Node directamente para que funcione igual en
  PowerShell y en bash. Alternativas descartadas: transformar `cookie` con
  `transformIgnorePatterns` (más configuración y frágil) o forzar `cookie@1` con `overrides`
  (cambia una dependencia interna de Fastify).
- **Alternativas:**
  - `@swc/jest` (permite quedarse en TS 7, pero compila sin chequear tipos y suma un binario
    nativo, `@swc/core`).
  - Babel (`babel-jest`, que tampoco chequea tipos y necesita sus propios presets).
  - Vitest (era la primera propuesta; se cambió a Jest por decisión del autor).

## 4. Base de datos local

- **Decisión:** `postgres:15-alpine` en `docker-compose.yml` en la raíz, con volumen nombrado
  `postgres_data` y `healthcheck` con `pg_isready`. Sin la clave `version:`.
- **Por qué:** es la imagen que indica la consigna. El volumen nombrado cumple FR-002 (los
  datos sobreviven a `docker compose down` sin `-v`). El healthcheck permite
  `docker compose up -d --wait`, que vuelve recién cuando Postgres acepta conexiones. La clave
  `version:` está obsoleta en Compose v2 y solo genera un warning.
- **Alternativas:** Postgres instalado en Windows (no es reproducible para el evaluador).

## 5. Acceso a datos: Prisma 7

- **Decisión:** `prisma`, `@prisma/client` y `@prisma/adapter-pg`, los tres fijos en 7.10.0.
  Generador `prisma-client` con salida en `backend/src/generated/prisma` (no se versiona) y
  `prisma.config.ts` en `backend/`.
- **Por qué:**
  - El tag `latest` de `prisma` apunta hoy a `8.0.0-rc.22`, una release candidate. Por eso se
    fija la 7.10.0 estable en los tres paquetes, que tienen que coincidir.
  - En Prisma 7 la URL de la base va en `prisma.config.ts`, no en el schema, y el cliente se
    conecta mediante un *driver adapter* (`PrismaPg`). Es lo que exige la versión, no una
    elección nuestra.
  - El schema queda donde lo pone el árbol de la consigna
    (`document-processing/infrastructure/persistence/models/schema.prisma`) y
    `prisma.config.ts` apunta a esa ruta.
  - En la prueba, `prisma generate` funcionó con un schema **sin modelos**, que es el caso de
    este spec (las tablas llegan en el 002). El cliente generado compila con TS 6.
- **Alternativas:** Prisma 6 (configuración vieja, ya sin soporte principal); `pg` directo
  para el health check (sería más corto en este spec, pero Prisma es parte del stack y en el
  002 se usa igual).

## 6. Chequeo de salud y timeout

- **Decisión:** `SELECT 1` con `prisma.$queryRaw`, corriendo contra un timeout de 2 segundos
  con `Promise.race`. La conexión es perezosa: no se llama a `$connect()` al arrancar.
- **Por qué:**
  - Con la conexión perezosa, el servicio arranca aunque la base esté apagada y se recupera
    solo cuando la base vuelve, porque cada consulta reintenta la conexión (FR-005).
  - En la prueba, con la base apagada la consulta falló en unos 240 ms (conexión rechazada).
    El timeout cubre el otro caso: una base que acepta la conexión pero no responde.
  - 2 s queda holgado dentro de SC-002 (< 5 s).
- **Alternativas:** `connectionTimeoutMillis` del pool de `pg` (cubre la conexión pero no una
  consulta colgada); un endpoint que solo responda "vivo" (no cumple FR-003).

## 7. Inyección de dependencias: Awilix 13

- **Decisión:** `InjectionMode.CLASSIC`, `strict: true`, clases registradas con
  `asClass(...).singleton()` y valores (config, cliente Prisma) con `asValue(...)`.
- **Por qué:**
  - CLASSIC resuelve por el **nombre del parámetro** del constructor: si `GetHealthQueryHandler`
    tiene `constructor(private readonly databaseHealthChecker: IDatabaseHealthChecker)`,
    Awilix le inyecta lo registrado como `databaseHealthChecker`. Así los constructores quedan
    como TypeScript normal, sin decoradores.
  - `strict: true` detecta errores de configuración al resolver. En la prueba avisó que un
    singleton dependía de algo con una vida más corta: los valores fijos van con `asValue`.
  - Funciona porque no se minifica el código. Si se minificara, los nombres de los parámetros
    cambiarían y habría que pasar a PROXY.
- **Alternativas:** PROXY (los constructores reciben un objeto `{ dep1, dep2 }`, una forma
  menos habitual de escribir clases); inyección manual (la consigna recomienda un contenedor).

## 8. Configuración: Convict + dotenv

- **Decisión:** `dotenv` carga `backend/.env` y Convict define el schema, toma los valores de
  `process.env` y valida con `validate({ allowed: 'strict' })`. Variables de este spec: `PORT`
  (formato `port`, default 3000) y `DATABASE_URL` (obligatoria, `sensitive`). Lo obligatorio
  se valida con un formato propio que rechaza strings vacíos.
- **Por qué:** Convict es lo que pide el árbol de la consigna (`IConvictProps.ts`). Sus errores
  nombran la clave y el valor recibido (FR-008, SC-004). Con `sensitive: true` la URL, que
  incluye la contraseña, no aparece en los logs.
- **Alternativas:** `process.loadEnvFile()` nativo de Node 24 en lugar de `dotenv` (se queda
  `dotenv` por pedido explícito y porque es lo que usa la documentación de Prisma en
  `prisma.config.ts`); validar a mano o con Zod (no es lo que pide la consigna).

## 9. Manejo de errores HTTP

- **Decisión:**
  - Dos errores esperables en `shared/domain/errors.ts`: `ValidationError` y `NotFoundError`.
  - Una función pura `toHttpError(error)` traduce cualquier error a
    `{ statusCode, body: { error: { type, message } } }`.
  - Fastify la usa en `setErrorHandler`, y `setNotFoundHandler` responde con el mismo formato.
- **Mapeo:**
  - `ValidationError` → 400 `VALIDATION_ERROR`.
  - `NotFoundError` → 404 `NOT_FOUND`.
  - Errores 4xx propios de Fastify (por ejemplo, un JSON mal formado) → su código, con tipo
    `VALIDATION_ERROR`.
  - Cualquier otro error → 500 `INTERNAL_ERROR`, con un mensaje genérico. El detalle va al log
    con `request.log.error`.
- **Por qué:** al ser una función pura, el mapeo se testea sin levantar un servidor. Es un
  único lugar que conoce los códigos HTTP (FR-012, FR-013).
- **Alternativas:** una jerarquía de errores con `statusCode` dentro de cada clase de dominio
  (mezcla HTTP con el dominio y viola el principio I).

## 10. Controllers desacoplados de Fastify

- **Decisión:**
  - `IHttpRequest` (`params`, `query`, `body`) e `IHttpResponse` (`statusCode`, `body`).
  - `BaseController` abstracto con `handle(request)` y un helper `respond(result, statusCode)`.
    Si el `Either` es `left`, lanza el error para que lo tome el manejador central; si es
    `right`, devuelve la respuesta.
  - Una función `adaptRoute(controller)` convierte la request de Fastify en `IHttpRequest` y
    envía el `IHttpResponse`.
- **Por qué:** los controllers no importan Fastify, así que se testean con objetos planos.
  "Dejar que los errores suban" es lo que pide la consigna: el controller no tiene
  `try/catch` y el error termina en `setErrorHandler`.
- **Alternativas:** controllers que reciben `FastifyRequest`/`FastifyReply` (más corto, pero
  acoplan la capa de presentación al framework).

## 11. Health check con el patrón completo

- **Decisión:** el health check se arma como una query más: `GetHealthQuery` +
  `GetHealthQueryHandler`, que depende de la interfaz `IDatabaseHealthChecker`,
  implementada por `PrismaDatabaseHealthChecker`. `HealthController` responde 200 si la base
  está arriba y 503 si no.
- **Por qué:** son cuatro archivos chicos que prueban de punta a punta las piezas compartidas
  (Either, IQueryHandler, BaseController, contenedor, manejador de errores) antes de usarlas
  con uploads. Además, el handler se testea con un doble de la interfaz, sin base.
- **Alternativas:** una ruta de Fastify que consulte Prisma directamente (menos código, pero
  las piezas compartidas se probarían recién en el 002 y sería exactamente el anti-patrón que
  prohíbe la constitución).

## 12. Qué del árbol de la consigna NO se crea en este spec

- `AggregateRoot.ts` y `ValueObject.ts` → spec 002 (los usan `Upload` y `FileName`).
- `IMessagePublisher.ts` e `IMessageConsumer.ts` → specs 003 y 005.
- `ICommandBus.ts` → se crea cuando haga falta un bus. Mientras los controllers reciban su
  handler por constructor, un bus es una indirección que no aporta (principio IV). Si al
  final no se usa, se documenta en el README.
- `Dockerfile` → no hace falta para correr local. Se evalúa con el diagrama de AWS.
