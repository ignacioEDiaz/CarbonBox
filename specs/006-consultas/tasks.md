# Tasks: Consultas

TDD: cada test se ve fallar antes de implementar. Verificar con el código de salida de Jest.

- [X] T001 `IUploadRepository.findPageByUserId(userId, { skip, take })` → `{ uploads, total }`: test de integración y `PrismaUploadRepository` (orden `createdAt desc, id desc`, `findMany` + `count` en transacción); doble en `InMemoryUploadRepository`.
- [X] T002 `PrismaActivityDataRepository.findByUploadId` ordenado por `date, category, id` (test de integración).
- [X] T003 [US1] Test y `ListUploadsQuery` + `ListUploadsQueryHandler`: defaults, rango, 400, solo el usuario, `toUploadView` compartido.
- [X] T004 [US2] Test y `GetUploadResultsQuery` + `GetUploadResultsQueryHandler`: 404, vacío, formato.
- [X] T005 Tests y controllers `ListUploadsController` y `GetUploadResultsController`, rutas y registro en Awilix (+ test del contenedor).
- [X] T006 Test HTTP de los dos endpoints con `server.inject`.
- [X] T007 Prueba a mano con curl, README, CLAUDE.md y USO-DE-IA.md.
