# Contrato: repositorios

Este spec no expone endpoints. Su interfaz pública son los repositorios que usan los specs
003 (subida), 005 (worker) y 006 (consultas). Las interfaces viven en
`backend/src/document-processing/domain/repositories/` y se implementan con Prisma en
`infrastructure/persistence/repositories/`.

## IUploadRepository

| Método | Devuelve | Comportamiento |
|---|---|---|
| `save(upload: Upload)` | `Promise<void>` | Crea el upload si no existe o lo actualiza (estado, conteos, mensaje de error, `updatedAt`) |
| `findById(id: string)` | `Promise<Upload \| null>` | El upload reconstruido con sus reglas intactas, o `null` si no existe (también para ids mal formados) |

## IActivityDataRepository

| Método | Devuelve | Comportamiento |
|---|---|---|
| `saveForUpload(uploadId: string, rows: ActivityData[])` | `Promise<void>` | En una transacción: borra las filas de ese upload e inserta `rows`. Si el upload no existe, lanza y no guarda nada |
| `findByUploadId(uploadId: string)` | `Promise<ActivityData[]>` | Las filas de ese upload; lista vacía si no tiene |

## Registro en el contenedor

`registerDocumentProcessingModule(container)` en
`infrastructure/dependency-injection/DocumentProcessingModule.ts` registra:

| Nombre | Implementación |
|---|---|
| `uploadRepository` | `PrismaUploadRepository` |
| `activityDataRepository` | `PrismaActivityDataRepository` |

Con Awilix en modo CLASSIC, un handler que declare
`constructor(private readonly uploadRepository: IUploadRepository)` recibe la
implementación de Prisma sin conocerla.
