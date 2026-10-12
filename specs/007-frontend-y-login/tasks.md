# Tasks: Frontend y login

TDD en el backend; verificar con el código de salida de Jest.

## Backend: login

- [ ] T001 Config `jwt { secret, expiresIn }` (JWT_SECRET obligatorio, mínimo 32 caracteres), `.env.example`, `testConfig` y test de config.
- [ ] T002 `UnauthorizedError` (401) y `ConflictError` (409) en errors y en el manejador central, con test.
- [ ] T003 Value objects `Email` y `Password` y entidad `User` (tests primero).
- [ ] T004 Tabla `User` (migración), `IUserRepository` y `PrismaUserRepository` (`DuplicateEmailError` → conflicto), test de integración.
- [ ] T005 `IPasswordHasher` + `ScryptPasswordHasher` e `ITokenService` + `JwtTokenService` (tests primero).
- [ ] T006 `RegisterUserCommand` + handler y `LoginQuery` + handler, con dobles (tests primero).
- [ ] T007 Controllers, rutas `POST /api/v1/auth/register` y `/login`, registro en Awilix, test HTTP.

## Backend: rutas protegidas

- [ ] T008 `adaptAuthenticatedRoute` y `userId` en `IHttpRequest`; rutas de uploads protegidas; controllers usan el usuario del token.
- [ ] T009 Queries con `userId`: ajeno → NotFound (por id, resultados, errores); Idempotency-Key de otro usuario → 409.
- [ ] T010 `GET /api/v1/uploads/summary` (repositorio, query, controller, ruta).
- [ ] T011 Actualizar los tests HTTP y de integración para mandar token; test de separación entre usuarios.

## Frontend

- [ ] T012 Proyecto Next 16.3.8 en `frontend/` con TypeScript, Tailwind 4, TanStack Query, Axios, `rewrites` a la API y puerto 3001.
- [ ] T013 `shared/lib` (api-client con interceptores, query-client), auth (login, registro, logout, guardia de rutas).
- [ ] T014 Dashboard, lista con badges y paginación, subida con progreso y redirección, detalle con polling, resultados y errores.
- [ ] T015 `npm run build` sin errores y prueba a mano de punta a punta.
- [ ] T016 README, CLAUDE.md y USO-DE-IA.md.
