# Implementation Plan: Base del proyecto

**Branch**: `001-base-del-proyecto` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-base-del-proyecto/spec.md`

## Summary

Dejar el entorno listo para construir el sistema:
- PostgreSQL 15 en Docker Compose con volumen persistente.
- Un servicio Fastify en TypeScript que lee y valida su configuración con Convict y expone
  `GET /health`, que informa el estado del servicio y de la base (`SELECT 1` con timeout de
  2 s, 503 si la base no responde).
- Las piezas compartidas que usan todos los specs siguientes: `Either`, los contratos de
  command y query, `BaseController` desacoplado de Fastify, el manejador central de errores y
  el contenedor de Awilix.

El health check se implementa como una query más (`GetHealthQuery` + handler + interfaz), para
probar las piezas compartidas de punta a punta antes de usarlas con uploads. Ver
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`) sobre Node.js 24, módulos CommonJS
(`moduleResolution: bundler`). TS 6 y no TS 7 porque `ts-jest` no soporta TS 7.

**Primary Dependencies**: Fastify 5.12.5, Awilix 13.0.5, Convict 6.2.5, dotenv 18.0.7,
Prisma 7.10.0 (`prisma`, `@prisma/client`, `@prisma/adapter-pg`, todos en la misma versión).
Desarrollo: tsx 4.23.15, Jest 30.5.2, ts-jest 29.4.14, `@types/jest` 30.0.0, `@types/node`
24, `@types/convict` 6.1.6. Todas fijas con versión exacta.

**Storage**: PostgreSQL 15 (`postgres:15-alpine`) en Docker Compose, volumen `postgres_data`.
Sin tablas en este spec.

**Testing**: Jest + ts-jest (los tests chequean tipos). Unitarios con TDD para las piezas compartidas, el handler de salud y la
configuración. Tests HTTP con `fastify.inject` para `/health` (con un doble del checker) y
para el formato del 404, sin base real. La caída y recuperación de la base se verifican a
mano con [quickstart.md](quickstart.md).

**Target Platform**: desarrollo local en Windows 10 con Docker Desktop. La API corre con
`npm run dev`, fuera de Docker.

**Project Type**: servicio web (backend). El frontend llega en el spec 007.

**Performance Goals**: `/health` responde en menos de 1 s con la base arriba y en menos de
5 s con la base caída (SC-002).

**Constraints**:
- El servicio arranca y sigue vivo sin base (conexión perezosa, sin `$connect()` al inicio).
- Sin `any`.
- `DATABASE_URL` nunca aparece en logs ni en respuestas.

**Scale/Scope**: un desarrollador y un evaluador en local. Alrededor de 20 archivos fuente
chicos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple este plan | Estado |
|---|---|---|
| I. DDD + Clean + CQRS | El health check es una query con su handler, que depende de la interfaz `IDatabaseHealthChecker`; la implementación con Prisma está en infraestructura. `Either` y los errores en `shared/domain` no importan nada externo. Controllers sin `try/catch` ni Prisma; errores en `setErrorHandler`. Inyección por constructor con Awilix. | ✅ |
| II. Estructura de la consigna | Se usan las rutas del árbol (`main/`, `config/`, `shared/...`, el schema en `document-processing/infrastructure/persistence/models/`). Los agregados están justificados en Complexity Tracking. | ✅ con desvíos justificados |
| III. TDD | Las tareas de cada pieza empiezan con su test en rojo. Las piezas de `domain` y `application` y la configuración tienen tests unitarios; HTTP se prueba con `fastify.inject`. Lo que depende de Docker se verifica a mano con el quickstart. | ✅ |
| IV. Legible y mínimo | No se crean `ICommandBus`, `AggregateRoot`, `ValueObject` ni la mensajería hasta que se usen. Cada dependencia está justificada en research.md. Sin ESLint: `strict` cubre los `any` implícitos y los explícitos se revisan. | ✅ |
| V. Punta a punta | El spec termina con algo que se ejecuta y verifica: `docker compose up` → `npm run dev` → `/health`. | ✅ |
| Stack y restricciones | Postgres en Docker, la API con npm, Windows; `.env` sin versionar y `.env.example` versionado. | ✅ |

**Re-check post diseño:** sin cambios. El diseño de Phase 1 (data-model, contrato y
quickstart) no introdujo nuevas violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/001-base-del-proyecto/
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas y alternativas
├── data-model.md        # Tipos compartidos y configuración
├── quickstart.md        # Guía de validación manual
├── contracts/
│   └── http-api.md      # GET /health y formato de error
└── tasks.md             # Lo genera /speckit-tasks
```

### Source Code (repository root)

```text
docker-compose.yml                       # Solo postgres:15-alpine + volumen postgres_data
backend/
├── package.json                         # scripts: dev, test, test:watch, typecheck, postinstall
├── tsconfig.json
├── jest.config.js                       # preset ts-jest, entorno node, roots: tests/
├── prisma.config.ts                     # Ruta del schema y DATABASE_URL (Prisma 7)
├── .env.example                         # PORT y DATABASE_URL de ejemplo
├── src/
│   ├── main/
│   │   ├── index.ts                     # Bootstrap: config → contenedor → App.listen; errores de arranque
│   │   ├── App.ts                       # Crea Fastify, registra rutas y el manejador de errores
│   │   └── container.ts                 # Registro de Awilix
│   ├── config/
│   │   ├── IConvictProps.ts
│   │   └── index.ts                     # dotenv + schema de Convict + loadConfig()
│   ├── document-processing/
│   │   └── infrastructure/persistence/models/
│   │       └── schema.prisma            # Solo generator + datasource (sin modelos)
│   ├── health/
│   │   ├── application/
│   │   │   ├── GetHealthQuery.ts
│   │   │   ├── GetHealthQueryHandler.ts
│   │   │   └── IDatabaseHealthChecker.ts
│   │   ├── infrastructure/
│   │   │   └── PrismaDatabaseHealthChecker.ts
│   │   └── presentation/
│   │       └── HealthController.ts
│   ├── shared/
│   │   ├── domain/
│   │   │   ├── Either.ts
│   │   │   └── errors.ts                # ValidationError, NotFoundError
│   │   ├── application/
│   │   │   ├── ICommandHandler.ts
│   │   │   └── IQueryHandler.ts
│   │   └── infrastructure/
│   │       ├── http/
│   │       │   ├── IHttpRequest.ts
│   │       │   ├── IHttpResponse.ts
│   │       │   ├── BaseController.ts
│   │       │   ├── adaptRoute.ts        # Fastify ⇄ IHttpRequest/IHttpResponse
│   │       │   └── errorHandler.ts      # toHttpError() + handlers de error y 404
│   │       └── persistence/
│   │           └── createPrismaClient.ts
│   └── generated/prisma/                # Generado por prisma generate (no se versiona)
└── tests/
    ├── unit/                            # Misma estructura que src/
    └── http/                            # fastify.inject sobre App
```

**Structure Decision**: monorepo con `backend/` (y `frontend/` en el spec 007), con
`docker-compose.yml` en la raíz. Dentro de `backend/src` se respeta el árbol de la consigna.
Los tests van en `backend/tests/`, separados de `src/`, para que `src/` siga siendo
exactamente el árbol de la consigna más los agregados de la tabla siguiente.

## Complexity Tracking

Desvíos del árbol de la consigna (principio II):

| Agregado | Por qué hace falta | Alternativa más simple descartada porque |
|---|---|---|
| `src/health/` (5 archivos) | El health check no pertenece al bounded context de negocio, pero se arma con el patrón completo para probar las piezas compartidas | Una ruta que consulte Prisma directo pondría lógica de infraestructura en la presentación (viola el principio I) |
| `main/container.ts` | Separa el registro de dependencias del arranque | Ponerlo en `App.ts` mezcla dos responsabilidades. `DocumentProcessingModule.ts` se suma en el 002 |
| `shared/domain/errors.ts` | `toHttpError` necesita distinguir validación y no encontrado sin conocer cada caso | Usar `Error` genérico obliga a responder 500 a todo |
| `shared/infrastructure/http/adaptRoute.ts` y `errorHandler.ts` | Desacoplan los controllers de Fastify y centralizan los errores | Pasar `FastifyRequest` a los controllers los ata al framework |
| `shared/infrastructure/persistence/createPrismaClient.ts` | Un único lugar crea el cliente con el adapter de pg | Crearlo en cada repositorio abriría varios pools de conexiones |
| `backend/prisma.config.ts` | Prisma 7 exige la URL y la ruta del schema en este archivo | Ninguna: es obligatorio en Prisma 7 |
| `backend/tests/` | La consigna no define dónde van los tests | Ponerlos junto a cada archivo agregaría archivos al árbol de `src/` |
