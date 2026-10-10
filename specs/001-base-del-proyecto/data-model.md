# Data Model: Base del proyecto

Este spec no crea tablas: el schema de Prisma solo tiene `generator` y `datasource`. Los
"modelos" son los tipos compartidos que van a usar los specs siguientes.

## Either&lt;L, R&gt; (`shared/domain/Either.ts`)

El resultado de una operación: `Left` (error) o `Right` (éxito), nunca las dos cosas.

| Miembro | Descripción |
|---|---|
| `Either.left(error)` | Crea un resultado de error |
| `Either.right(value)` | Crea un resultado exitoso |
| `isLeft()` / `isRight()` | Type guards: después del `if`, TypeScript sabe el tipo de `value` |
| `value` | El error (si es `Left`) o el valor (si es `Right`) |

Reglas:
- Inmutable: `value` es `readonly`.
- Es un tipo y un objeto con el mismo nombre, así se usa como en la consigna:
  `Promise<Either<Error, T>>` y `Either.left(...)`.

## Errores de aplicación (`shared/domain/errors.ts`)

| Clase | Cuándo se usa | Respuesta HTTP |
|---|---|---|
| `ValidationError` | Un dato de entrada no cumple una regla | 400 `VALIDATION_ERROR` |
| `NotFoundError` | El recurso pedido no existe | 404 `NOT_FOUND` |
| Cualquier otro `Error` | Falla inesperada | 500 `INTERNAL_ERROR` (sin detalles al cliente) |

Las dos clases extienden `Error`, fijan `name` y no saben nada de HTTP. La traducción a HTTP
vive en `toHttpError` (infraestructura).

## Contratos de handlers (`shared/application/`)

```ts
interface ICommandHandler<TCommand, TResult> {
  execute(command: TCommand): Promise<Either<Error, TResult>>;
}

interface IQueryHandler<TQuery, TResult> {
  execute(query: TQuery): Promise<Either<Error, TResult>>;
}
```

## HTTP (`shared/infrastructure/http/`)

| Tipo | Campos |
|---|---|
| `IHttpRequest` | `params: unknown`, `query: unknown`, `body: unknown` |
| `IHttpResponse` | `statusCode: number`, `body: unknown` |

Los campos son `unknown` y no `any`: cada controller valida o convierte lo que usa.

## HealthStatus (`health/application/`)

| Campo | Valores |
|---|---|
| `service` | `"up"` (si el servicio responde, está vivo) |
| `database` | `"up"` \| `"down"` |

`IDatabaseHealthChecker.isUp(): Promise<boolean>`: `true` si `SELECT 1` responde antes del
timeout de 2 s, `false` si falla o se agota el tiempo. Nunca lanza una excepción.

## Configuración (`config/`)

`IConvictProps`:

| Clave | Variable de entorno | Formato | Default | Obligatoria |
|---|---|---|---|---|
| `port` | `PORT` | `port` (0 a 65535) | `3000` | No |
| `database.url` | `DATABASE_URL` | string no vacío, `sensitive` | ninguno | Sí |

Si la validación falla, el servicio termina con código 1 y un mensaje que nombra la clave y el
valor recibido. `DATABASE_URL` nunca se muestra.
