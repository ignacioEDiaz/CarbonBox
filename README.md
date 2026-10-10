# CarbonBox: procesamiento asíncrono de documentos

Prueba técnica full stack. El usuario sube un CSV con datos de actividad
(`category,amount,unit,date`), el sistema lo procesa en segundo plano y después muestra los
resultados.

El proyecto se construye con **Spec-Driven Development** ([GitHub Spec Kit](https://github.com/github/spec-kit)):
cada parte tiene su spec, su plan y sus tareas en [`specs/`](specs/), y todas respetan la
[constitución del proyecto](.specify/memory/constitution.md).

## Estado

| Spec | Qué construye | Estado |
|---|---|---|
| [001-base-del-proyecto](specs/001-base-del-proyecto/) | Postgres en Docker, servicio Fastify, `/health`, configuración, piezas compartidas | ✅ Completo |
| 002-dominio-y-persistencia | Entidades `Upload` y `ActivityData`, schema y repositorios | Pendiente |
| 003 a 007 | Subida, parseo, worker, consultas, frontend | Pendiente |

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) corriendo.
- Node.js 24 o superior.
- El puerto 5432 libre para Postgres y el 3000 para la API.

## Cómo levantarlo

Desde la raíz del repositorio (PowerShell o bash):

```bash
docker compose up -d --wait        # PostgreSQL 15, espera a que esté listo
cd backend
cp .env.example .env               # en PowerShell: Copy-Item .env.example .env
npm install                        # también genera el cliente de Prisma
npm run dev                        # API en http://localhost:3000
```

Comprobar que todo responde:

```bash
curl http://localhost:3000/health
# {"service":"up","database":"up"}
```

La guía completa de verificación, incluida la base caída, la persistencia y los errores de
configuración, está en [quickstart.md](specs/001-base-del-proyecto/quickstart.md).

## Scripts (`backend/`)

| Script | Qué hace |
|---|---|
| `npm run dev` | Corre la API con recarga automática (`tsx watch`) |
| `npm test` | Corre todos los tests con Jest |
| `npm run test:watch` | Tests en modo watch, para el ciclo de TDD |
| `npm run typecheck` | Chequea tipos con `tsc` sin generar archivos |

## API

| Método | Endpoint | Respuesta |
|---|---|---|
| GET | `/health` | `200 {"service":"up","database":"up"}`; `503` si la base no responde |

Todos los errores comparten el formato `{ "error": { "type", "message" } }`: ver el
[contrato](specs/001-base-del-proyecto/contracts/http-api.md).

## Arquitectura

DDD + Clean Architecture + CQRS. Las dependencias apuntan hacia adentro:
`presentation → application → domain`, e `infrastructure` implementa las interfaces que
definen `domain` y `application`.

- Los handlers devuelven `Either<Error, Result>`. Los errores esperables viajan como valor,
  no como excepción.
- Los controllers no tienen `try/catch` ni lógica de negocio. Un manejador central de Fastify
  traduce cualquier error a HTTP.
- Las dependencias se inyectan por constructor con Awilix y los handlers dependen de
  interfaces.

### Estructura y desvíos del árbol de la consigna

Se respeta el árbol de carpetas de la consigna. Estos son los agregados y por qué:

| Agregado | Por qué |
|---|---|
| `backend/src/health/` | El health check se arma con el patrón completo (query, handler, interfaz, controller) para probar las piezas compartidas de punta a punta |
| `backend/src/main/container.ts` | Separa el registro de dependencias del arranque |
| `backend/src/shared/domain/errors.ts` | `ValidationError` y `NotFoundError`, para que el manejador central sepa qué código HTTP corresponde |
| `backend/src/shared/infrastructure/http/adaptRoute.ts` y `errorHandler.ts` | Desacoplan los controllers de Fastify y centralizan los errores |
| `backend/src/shared/infrastructure/persistence/createPrismaClient.ts` | Un único lugar crea el cliente de Prisma (un solo pool de conexiones) |
| `backend/prisma.config.ts` | Obligatorio en Prisma 7 |
| `backend/tests/` | La consigna no define dónde van los tests; se separan de `src/` para que `src/` siga el árbol |
| `docker-compose.yml` en la raíz | Lo levanta todo desde un lugar; ahí van a convivir el backend y el frontend |

Las decisiones técnicas, con sus alternativas descartadas, están en
[research.md](specs/001-base-del-proyecto/research.md).

## Limitaciones conocidas

- **`npm audit` reporta vulnerabilidades altas en dependencias transitivas:** `braces` y
  `micromatch` vía `fast-glob` en Awilix, y `deepmerge-ts` y `mysql2` en la CLI de Prisma. El
  arreglo que propone npm es bajar a versiones mayores anteriores (Awilix 6, Prisma 6), y no se
  aplicó. Ninguna procesa datos que envía el usuario: `fast-glob` solo lo usa
  `loadModules` de Awilix (no se usa), y `deepmerge-ts` y `mysql2` son parte de la CLI de
  Prisma (se usa PostgreSQL).
- **Los tests corren con `--experimental-vm-modules`.** `fastify.inject` depende de un paquete
  ESM puro (`cookie@2`) y Jest 30 solo puede cargarlo con esa bandera de Node (ver
  [research.md §3](specs/001-base-del-proyecto/research.md)).

## Uso de IA

Qué se generó con IA, qué se corrigió y qué se aprendió: [USO-DE-IA.md](USO-DE-IA.md).
