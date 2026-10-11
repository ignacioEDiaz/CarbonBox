# Data Model: Dominio y persistencia

## Bases (`shared/domain/`)

| Clase | Contenido |
|---|---|
| `ValueObject<T>` | `readonly value: T`; `equals(other)` compara por valor |
| `AggregateRoot` | `readonly id: string` |

## FileName: value object (`document-processing/domain/value-objects/FileName.ts`)

- `FileName.create(raw: string): Either<ValidationError, FileName>`.
- Reglas (FR-001):
  - se recortan los espacios alrededor;
  - no puede quedar vacío;
  - DEBE terminar en `.csv` sin distinguir mayúsculas (`/\.csv$/i`);
  - DEBE tener al menos un carácter antes de `.csv`, así que `".csv"` se rechaza.
- Ejemplos: `"datos.csv"` ✅, `"DATOS.CSV"` ✅, `"  datos.csv  "` ✅ (queda `"datos.csv"`),
  `""` ❌, `"datos.txt"` ❌, `"datos"` ❌, `".csv"` ❌.

## UploadStatus: value object (`document-processing/domain/value-objects/UploadStatus.ts`)

- Valores (FR-003): `"PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"`, con instancias
  estáticas `UploadStatus.PENDING`, etc., y `UploadStatus.from(value)` para el mapper.
- `canTransitionTo(next): boolean` según esta tabla (FR-004, Clarifications):

| Desde \ Hacia | PENDING | PROCESSING | COMPLETED | FAILED |
|---|---|---|---|---|
| PENDING | ❌ | ✅ | ❌ | ❌ |
| PROCESSING | ❌ | ✅ (reintento) | ✅ | ✅ |
| COMPLETED | ❌ | ❌ | ❌ | ❌ |
| FAILED | ❌ | ❌ | ❌ | ❌ |

## Upload: aggregate root (`document-processing/domain/entities/Upload.ts`)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `string` | `randomUUID()` al crear |
| `fileName` | `FileName` | Válido (FR-001) |
| `fileUrl` | `string` | No vacío |
| `status` | `UploadStatus` | Nace `PENDING` |
| `userId` | `string` | Lo pasa quien crea (hoy `"user-123"`) |
| `totalRows`, `processedRows`, `failedRows` | `number \| null` | `null` hasta COMPLETED |
| `errorMessage` | `string \| null` | Solo en FAILED |
| `createdAt` | `Date` | Al crear |
| `updatedAt` | `Date` | Al crear y en cada transición |

Comportamiento:

- `Upload.create({ fileName, fileUrl, userId }): Either<ValidationError, Upload>`.
- `Upload.restore(props): Upload`: reconstruye desde la base, sin validar (lo usa el mapper).
- Transiciones. Todas devuelven `Either<ValidationError, void>` y, si fallan, no modifican
  nada (FR-007):
  - `markAsProcessing()`: PENDING o PROCESSING → PROCESSING.
  - `markAsCompleted({ totalRows, processedRows, failedRows })`: PROCESSING → COMPLETED.
    Exige enteros ≥ 0 y `processedRows + failedRows === totalRows` (FR-005).
  - `markAsFailed(errorMessage)`: PROCESSING → FAILED. Exige un mensaje no vacío (FR-006).

## ActivityData: entidad (`document-processing/domain/entities/ActivityData.ts`)

| Campo | Tipo | Regla (FR-009) |
|---|---|---|
| `id` | `string` | `randomUUID()` al crear |
| `uploadId` | `string` | Upload al que pertenece (FR-010) |
| `category` | `string` | Recortado, no vacío |
| `amount` | `number` | Finito y > 0 |
| `unit` | `string` | Recortado, no vacío |
| `date` | `string` | `"YYYY-MM-DD"` y fecha calendario real (`2024-02-31` ❌) |
| `createdAt` | `Date` | Al crear |

- `ActivityData.create({ uploadId, category, amount, unit, date }): Either<ValidationError, ActivityData>`.
- `ActivityData.restore(props): ActivityData`.
- Es inmutable: no tiene métodos que la modifiquen.

## Persistencia (schema Prisma)

Basado en el schema mínimo de la consigna, con estos cambios (ver research.md):

| Cambio | Motivo |
|---|---|
| `status UploadStatus` (enum) en lugar de `String` | La base rechaza valores inválidos (§1) |
| `date DateTime @db.Date` | Un día sin hora: sin corrimiento por zona horaria (§2) |
| `@@index([uploadId])` en `ActivityData` | Lectura y reemplazo por upload (§7) |

Relación: `Upload 1 ── N ActivityData`, con clave foránea `ActivityData.uploadId → Upload.id`.

Mapeo en `PrismaUploadMapper` y `PrismaActivityDataMapper` (`toDomain` / `toPersistence`):

- `FileName` ↔ `string`.
- `UploadStatus` ↔ el enum de Prisma.
- La fecha `"YYYY-MM-DD"` ↔ `Date`, escribiendo con `new Date("YYYY-MM-DD")` y leyendo con
  `toISOString().slice(0, 10)`.
