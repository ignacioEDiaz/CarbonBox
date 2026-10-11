# Research: Dominio y persistencia

Decisiones técnicas del spec 002. Las que tenían riesgo se probaron en un proyecto descartable
con Prisma 7.10 y el Postgres de Docker (2026-10-10): migraciones, ida y vuelta de fechas en
tres zonas horarias, reemplazo de filas en una transacción y error por upload inexistente.

## 1. Estado del upload: enum de Postgres

- **Decisión:** `enum UploadStatus { PENDING PROCESSING COMPLETED FAILED }` en el schema de
  Prisma, que crea un `CREATE TYPE ... AS ENUM` en Postgres. En el dominio, el value object
  `UploadStatus` usa los mismos cuatro valores.
- **Por qué:**
  - La base rechaza cualquier otro valor, aunque alguien escriba por fuera de la aplicación.
  - Prisma genera el tipo TypeScript `"PENDING" | "PROCESSING" | ...`, así que el mapper
    convierte sin casts.
  - En la prueba, el valor leído volvió como `string` (`"PENDING"`) y se mapea directo al
    value object.
- **Alternativas:** `String` como en el schema mínimo de la consigna. Funciona, pero la base
  aceptaría `"COMPLETADO"` o un typo. El costo del enum es que sumar un estado requiere una
  migración, lo que es razonable porque cambiar los estados es un cambio de negocio.

## 2. Fecha de la actividad: `DATE` y `"YYYY-MM-DD"` en el dominio

- **Decisión:**
  - Columna `date DateTime @db.Date` (tipo `DATE` de Postgres, sin hora).
  - En el dominio la fecha es un `string` `"YYYY-MM-DD"` validado como fecha calendario real.
  - El mapper convierte con dos reglas fijas: al escribir, `new Date("2024-01-15")`
    (medianoche UTC); al leer, `date.toISOString().slice(0, 10)`.
- **Por qué:**
  - Un dato de actividad es un día, no un instante. Con `TIMESTAMP`, la zona horaria del
    proceso puede correr el día.
  - En la prueba, la fecha volvió como `2024-01-15` con el proceso en UTC-3 (Argentina), UTC+9
    (Tokio) y UTC+14 (Kiritimati).
  - Que el dominio maneje un string evita que alguien use `getDate()` (hora local) por error.
    La conversión vive en un solo lugar: el mapper.
- **Alternativas:** guardar `TIMESTAMP` a medianoche (frágil ante zonas horarias) o un `Date`
  de JS en el dominio (obliga a recordar siempre los métodos UTC).

## 3. Cantidad: `Float`

- **Decisión:** `amount Float` (`DOUBLE PRECISION`), como en la consigna.
- **Por qué:** la cantidad se guarda y se muestra, no se usa para cálculos de precisión
  contable. Un `number` de JS y un `DOUBLE PRECISION` son el mismo formato (IEEE 754), así que
  el valor vuelve idéntico: en la prueba, `150.5` y `150.8` volvieron igual. Es lo que pide la
  consigna.
- **Alternativas:** `Decimal` (exacto en base 10, pero Prisma lo devuelve como objeto
  `Prisma.Decimal` y hay que convertirlo; tiene sentido si después se suman emisiones con
  precisión fija, y queda anotado como mejora).

## 4. Identificadores: `crypto.randomUUID()` en el dominio

- **Decisión:** `Upload.create()` y `ActivityData.create()` generan el id con `randomUUID`
  de `node:crypto`. La columna es `String @id` (`TEXT`).
- **Por qué:**
  - Las entidades nacen con identidad antes de guardarse: el handler del 003 puede publicar
    el `uploadId` sin esperar a la base.
  - `node:crypto` es parte de Node, no una librería externa: el dominio sigue sin depender de
    infraestructura.
  - `TEXT` y no `UUID` de Postgres: con `@db.Uuid`, buscar un id mal formado (por ejemplo,
    `GET /uploads/abc`) hace fallar la consulta con un error de sintaxis (500) en lugar de
    devolver "no encontrado" (404). En la prueba, `findUnique` con `"no-es-uuid"` devolvió
    `null`.
- **Alternativas:** ids autoincrementales (revelan cantidad y orden; el id no existe hasta
  guardar) o `cuid`/`ulid` (otra dependencia).

## 5. Migraciones de Prisma

- **Decisión:**
  - Migraciones en `backend/src/document-processing/infrastructure/persistence/models/migrations/`,
    junto al schema, declaradas en `prisma.config.ts`.
  - Scripts:
    - `db:migrate`: `prisma migrate dev && prisma generate`. Se usa al cambiar el schema;
      crea una migración nueva.
    - `db:deploy`: `prisma migrate deploy`. Aplica las migraciones existentes; es lo que corre
      quien clona el repo y la base de tests.
- **Por qué:**
  - `migrate deploy` no es interactivo, no genera migraciones nuevas y **crea la base si no
    existe** (verificado). Cumple SC-003 con un solo comando.
  - En Prisma 7, `migrate dev` ya no corre `generate` solo (verificado), así que el script
    encadena los dos.
- **Alternativas:** `prisma db push` (sincroniza sin migraciones versionadas: no cumple
  FR-015); `migrate reset` para preparar la base de tests (borra todo y Prisma la bloquea
  cuando la ejecuta un agente de IA sin consentimiento explícito; con `deploy` no hace falta).

## 6. Tests de integración contra una base separada

- **Decisión:**
  - Base `document_processing_test` en el mismo contenedor, con la URL en `TEST_DATABASE_URL`
    (en `.env.example`).
  - Jest con dos `projects`: `unit` (`tests/unit` y `tests/http`, sin base) e `integration`
    (`tests/integration`).
  - El proyecto `integration` tiene un `globalSetup` que corre `prisma migrate deploy` contra
    `TEST_DATABASE_URL`, lo que crea la base si falta y aplica las migraciones.
  - Cada test crea sus propios uploads con ids aleatorios y solo consulta esos, así que no
    hace falta limpiar tablas entre tests y pueden correr en paralelo.
  - Scripts `test` (todo), `test:unit` y `test:integration`.
- **Por qué:**
  - Los tests nunca tocan los datos de desarrollo.
  - Aislar por id es más simple que truncar tablas y evita tests que se pisan.
  - Con `test:unit` el ciclo de TDD sigue sin necesitar Docker.
- **Alternativas:** usar la base de desarrollo (los tests ensucian datos reales); un
  contenedor aparte para tests (más configuración en Compose); truncar tablas en cada test
  (obliga a correr en serie).

## 7. Reemplazo idempotente de filas

- **Decisión:** `saveForUpload(uploadId, rows)` corre
  `$transaction([deleteMany({ uploadId }), createMany(rows)])`.
- **Por qué:** cumple FR-013, porque es todo o nada y reemplaza las filas de un intento
  anterior (Clarifications del spec). En la prueba, 5 filas reemplazadas por 1.000 tardaron
  unos 350 ms al guardar y unos 22 ms al leer, dentro de SC-004 (2 s y 1 s). El índice en
  `uploadId` hace barato el borrado y la lectura.
- **Upload inexistente:** la clave foránea rechaza el insert con `P2003`, la transacción se
  revierte y quedan 0 filas (verificado, SC-005). No se captura: en el flujo real el worker
  carga el upload antes de guardar sus filas, así que esto solo pasaría por un error de
  programación, y se deja subir como excepción inesperada.
- **Alternativas:** `ON CONFLICT DO NOTHING` con una clave por fila (suma una columna de
  número de fila) o guardar las filas y el COMPLETED en una sola transacción entre dos
  repositorios (*unit of work*: más complejo).

## 8. Repositorios y qué devuelven

- **Decisión:** las interfaces viven en `domain/repositories`. `findById` devuelve
  `Upload | null`; `save` y `saveForUpload` devuelven `void`.
- **Por qué:** el repositorio es un puerto de persistencia: "no está" es un resultado normal
  (`null`), y es el handler (specs 003 y 006) el que lo traduce a `Either.left(new
  NotFoundError(...))`, como pide la constitución para los handlers. Así el repositorio no
  decide reglas de negocio.
- **Alternativas:** que el repositorio devuelva `Either` (mezcla la decisión de negocio "es
  un error" con el acceso a datos).

## 9. Bases del dominio: `ValueObject` y `AggregateRoot`

- **Decisión:** las dos clases base del árbol de la consigna, mínimas:
  - `ValueObject<T>`: guarda un `value` inmutable y compara por valor (`equals`).
  - `AggregateRoot`: guarda el `id`.
- **Por qué:** están en el árbol de la consigna y tienen uso real. `FileName` y
  `UploadStatus` extienden `ValueObject`, y `equals` se usa para comparar estados. `Upload`
  extiende `AggregateRoot`, lo que marca en el código quién es la raíz del agregado.
  `ActivityData` es una entidad dentro del agregado y no la extiende.
- **Alternativas:** no crearlas (menos archivos, pero se pierde la señal de DDD que evalúa la
  consigna); una clase `Entity` intermedia o eventos de dominio (nadie los usa todavía).
