# Implementation Plan: Frontend y login

**Branch**: `007-frontend-y-login` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

## Summary

**Backend:** un bounded context nuevo `auth` (como `health`): entidad `User` con los value
objects `Email` y `Password`, `IUserRepository` con Prisma (tabla `User`), registro como
command y login como query (no cambia estado). Las contraseñas se hashean con `scrypt` de
`node:crypto` detrás de `IPasswordHasher`; los tokens se firman con `jsonwebtoken` (HS256)
detrás de `ITokenService`. Las rutas de uploads pasan por `adaptAuthenticatedRoute`, que valida
el token y le pasa el `userId` al controller. Las queries reciben el `userId` y responden
NotFound si el upload es ajeno. Endpoint nuevo `GET /api/v1/uploads/summary`.

**Frontend:** Next.js 16.3.8 (App Router) + TypeScript + TanStack Query 5.104.0 + Axios 1.20.0
+ Tailwind 4.3.3, con el árbol de la consigna (`features/document-processing`, `shared/lib`) más
`features/auth`. Corre en el puerto 3001 y reenvía `/api/*` al backend con `rewrites` de Next.

## Decisiones

1. **Login es una query** (`LoginQuery`): verifica credenciales y firma un token, pero no
   escribe nada. El registro sí es un command.
2. **`scrypt` y no `bcrypt`**: viene con Node (sin dependencia nativa que compilar en Windows) y
   es un KDF recomendado. Formato guardado: `scrypt$<sal>$<hash>`; se compara con
   `timingSafeEqual`.
3. **Error genérico al loguear** ("Email o contraseña incorrectos"): no se revela si el email existe.
4. **`adaptAuthenticatedRoute`** en `shared/infrastructure/http`: lee `Authorization: Bearer`,
   valida con `ITokenService` y lanza `UnauthorizedError` (401 en el manejador central). Los
   controllers siguen sin `try/catch` y sin conocer JWT.
5. **Ownership en los handlers** (regla del caso de uso): `upload.userId !== userId` → NotFound.
6. **Idempotency-Key por usuario**: si la clave ya la usó otro usuario, 409 (no se devuelve un
   upload ajeno).
7. **Errores nuevos**: `UnauthorizedError` (401) y `ConflictError` (409).
8. **Config**: `JWT_SECRET` obligatorio (mínimo 32 caracteres) y `JWT_EXPIRES_IN` (por defecto `1h`).
9. **Frontend**: token en `localStorage`; un interceptor de Axios agrega el header y ante un 401
   borra el token y lleva a `/login`. `refetchInterval` de React Query hace el polling de 3 s y se
   apaga solo cuando el estado es final.

## Constitution Check

| Principio | Cómo lo cumple | Estado |
|---|---|---|
| I. DDD + Clean + CQRS | `User`, `Email`, `Password` en domain; command de registro y query de login con `Either`; JWT y scrypt detrás de interfaces; controllers sin lógica | ✅ |
| II. Estructura | Frontend con el árbol de la consigna; `auth/` es un agregado justificado (login pedido por el autor) | ✅ con desvío justificado |
| III. TDD | Tests primero en value objects, handlers, hasher, token service, rutas protegidas y separación de usuarios. El frontend se verifica con build y prueba a mano (sin tests: el diseño va a cambiar) | ✅ con excepción en el frontend |
| IV. Mínimo | Una dependencia de backend (`jsonwebtoken`); frontend con el stack de la consigna | ✅ |
| V. Punta a punta | Termina con todo el flujo usable desde el navegador | ✅ |

## Complexity Tracking

| Agregado o desvío | Por qué | Alternativa descartada |
|---|---|---|
| Contexto `auth` y tabla `User` | Pedido del autor | Seguir con `user-123` |
| `jsonwebtoken` | Firmar y verificar JWT bien es delicado | Implementar HS256 a mano |
| `GET /uploads/summary` | El dashboard pide conteos por estado; con la lista paginada no se pueden contar todos | Pedir todas las páginas desde el frontend |
| Sin tests de frontend | El diseño se rehace después; se verifica con build y a mano | Tests de componentes que se tirarían |
