# Implementation Plan: Consultas

**Branch**: `006-consultas` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

## Summary

Dos queries con su handler, controller y ruta, con el mismo patrón que `GetUploadByIdQuery`:

- `ListUploadsQuery` → `ListUploadsQueryHandler`: valida `page` y `limit`, llama a
  `IUploadRepository.findPageByUserId(userId, { skip, take })` y arma
  `{ data, total, page, limit }`. Cada elemento usa el mismo `toUploadView` que la consulta por
  id.
- `GetUploadResultsQuery` → `GetUploadResultsQueryHandler`: 404 si el upload no existe; si no,
  `IActivityDataRepository.findByUploadId` (ahora ordenado por fecha, categoría e id) mapeado a
  `{ category, amount, unit, date }`.

## Technical Context

TypeScript 6 / Node 24. Sin dependencias nuevas ni cambios de schema. Prisma: `findMany` con
`skip`, `take` y `orderBy`, y `count`, dentro de un `$transaction` para que `data` y `total`
salgan de la misma lectura de la base. Tests unitarios con dobles, de integración para los
repositorios y HTTP con `server.inject`.

## Decisiones

1. **La validación de `page` y `limit` vive en el handler**: es una regla del caso de uso, no de
   HTTP. El controller pasa los textos tal como llegan en la query string.
2. **Orden estable**: `createdAt desc, id desc`. Dos uploads del mismo milisegundo no se repiten
   ni se pierden entre páginas.
3. **`toUploadView` compartido**: se exporta desde `GetUploadByIdQueryHandler` para que la lista
   y el detalle no puedan divergir.
4. **Resultados ordenados en el repositorio** (`date, category, id`): cualquiera que los lea los
   recibe en el mismo orden.

## Constitution Check

| Principio | Cómo lo cumple | Estado |
|---|---|---|
| I. DDD + Clean + CQRS | Dos queries con handler y `Either`; controllers sin lógica | ✅ |
| II. Estructura | `GetUploadResults*` es el agregado que prevé la constitución; `ListUploads*` sigue el árbol | ✅ |
| III. TDD | Test primero en handlers, controllers, repositorios y HTTP | ✅ |
| IV. Mínimo | Sin dependencias ni tablas nuevas | ✅ |
| V. Punta a punta | Con esto el backend cumple los cuatro endpoints de la consigna | ✅ |

## Archivos

```text
backend/src/document-processing/
├── domain/repositories/IUploadRepository.ts                 # + findPageByUserId
├── application/queries/objects/{ListUploadsQuery,GetUploadResultsQuery}.ts
├── application/queries/handlers/{ListUploadsQueryHandler,GetUploadResultsQueryHandler}.ts
├── infrastructure/persistence/repositories/{PrismaUploadRepository,PrismaActivityDataRepository}.ts
├── infrastructure/dependency-injection/DocumentProcessingModule.ts
└── presentation/
    ├── controllers/{ListUploadsController,GetUploadResultsController}.ts
    └── routes/DocumentProcessingRoutes.ts
```
