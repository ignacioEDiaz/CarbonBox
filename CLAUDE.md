# CarbonBox - Prueba técnica Full Stack

Contexto del proyecto para Claude Code. Resume lo ya decidido en la etapa de
planificación. La consigna completa es `PRUEBA-TECNICA-FULLSTACK.md`; si está en
el repo, leela antes de proponer cambios de alcance.

## Qué es

Sistema de procesamiento asíncrono de documentos: el usuario sube un CSV con
datos de actividad (`category,amount,unit,date`), se procesa en segundo plano y
después se ven los resultados.

## Cómo trabajar conmigo

- Soy junior y tengo que **defender este código en una entrevista**. Explicá el
  porqué de cada decisión y no generes código que yo no pueda explicar.
- Avanzá de a un spec por vez. No pases al siguiente hasta que el actual
  funcione y esté verificado.
- Prioridad: que funcione de punta a punta antes que la arquitectura perfecta.
- Commits atómicos con mensajes descriptivos.
- Respondé en español.
- Registrá en `USO-DE-IA.md` qué se generó con IA, qué se corrigió y qué
  aprendí. Es un entregable obligatorio.

## Stack

- **Backend:** Node.js, TypeScript, Fastify, Prisma, PostgreSQL, Awilix (DI).
- **Frontend:** Next.js 14+ (App Router), TypeScript, React Query, Axios,
  Tailwind.
- **Infra local:** Docker Compose solo para PostgreSQL (y LocalStack si se usa).
  La API, el worker y el frontend corren con npm en la máquina, no en Docker.
- **Sistema operativo:** Windows, con Docker Desktop.

## Reglas de arquitectura (no negociables)

1. Clean Architecture con cuatro capas: `domain`, `application`,
   `infrastructure`, `presentation`. Las dependencias apuntan hacia adentro;
   `domain` no importa Prisma ni Fastify.
2. **Nada de lógica de negocio en controllers ni en el worker.** Los dos son
   puertas de entrada: traducen (HTTP o mensaje) a un command o query y llaman
   a un handler.
3. CQRS: commands (escritura) separados de queries (lectura), cada uno con su
   handler.
4. Todos los handlers devuelven `Either<Error, Result>`. Sin `try/catch` en
   controllers; un manejador de errores central en Fastify.
5. Inyección de dependencias por constructor, registrada con Awilix. Los
   handlers dependen de interfaces, nunca de clases concretas.
6. TypeScript sin `any`.
7. Sin autenticación: se asume `userId = "user-123"`.

## Flujo y orden de los pasos

**API (rápido), dentro de `CreateUploadCommandHandler`:**

1. Valida el nombre con `FileName` (debe terminar en `.csv`) y el encabezado
   (solo la primera línea: `category,amount,unit,date`).
2. Guarda el archivo crudo, sin parsear (`IFileStorage`).
3. Crea el `Upload` con estado `PENDING` y lo persiste.
4. Publica el mensaje `{ uploadId }` en la cola. Si falla, marca el upload
   `FAILED` ("No se pudo encolar el archivo para procesarlo") y responde error.
5. Responde `{ id, status, fileName, createdAt }`.

**Worker (lento, proceso aparte, `npm run worker`):**

6. Recibe el mensaje y llama a `ProcessFileCommandHandler`.
7. Marca el upload como `PROCESSING`.
8. Lee el archivo, lo parsea y valida fila por fila (`CsvParserService`).
9. Guarda las filas válidas en `ActivityData`.
10. Marca `COMPLETED` o `FAILED` (con `errorMessage`).
11. Borra el mensaje de la cola, recién al final, para que se reintente si
    algo falló antes.

**Frontend:** polling a `GET /uploads/:id` cada 3 segundos mientras el estado
no sea final.

### Decisiones ya tomadas

- **El registro en la base se crea antes de publicar el mensaje.** La consigna
  los lista al revés, pero así el worker nunca busca un upload que todavía no
  existe. Documentarlo en el README.
- **El mensaje lleva solo el `uploadId`**, no el archivo.
- **La API no parsea las filas.** Solo valida lo instantáneo: hay archivo, no
  está vacío, pesa hasta 10 MB, extensión `.csv` y el encabezado (solo la
  primera línea; ignora mayúsculas, espacios, `\r\n` y BOM). Un CSV con filas
  inválidas se sube bien y falla después en el worker. La regla del encabezado
  vive en un solo lugar y la reutiliza el parser del spec 004.
- **El archivo original se conserva** después de procesar: permite reintentar y
  auditar. En producción se limpiaría con lifecycle policies de S3.
- **Las transiciones de estado viven en la entidad `Upload`**
  (`PENDING -> PROCESSING -> COMPLETED | FAILED`); las inválidas se rechazan.
  Desde el spec 003 también `PENDING -> FAILED`, para el upload que no se pudo
  encolar: así ninguno queda en PENDING para siempre.
- **Idempotencia del procesamiento por `uploadId`** (spec 002). `PROCESSING ->
  PROCESSING` se acepta como reintento, y guardar las filas de un upload
  reemplaza las de un intento anterior (todo o nada). Procesar dos veces el
  mismo upload da el mismo resultado.

- **Cola y storage: SQS y S3 con LocalStack** (spec 003). El mock con array en
  memoria no sirve porque la API y el worker son procesos separados. En local
  se usa LocalStack en Docker; para pasar a AWS solo cambia la configuración
  (endpoint y credenciales), no el código. Igual quedan detrás de interfaces
  (`IFileStorage`, `IMessagePublisher`, `IMessageConsumer`) para testear los
  handlers con dobles. Se descartó una tabla de Postgres como cola: habría que
  programar a mano el visibility timeout y el contador de entregas que SQS ya
  trae, y después reemplazarla.

### Pendientes anotados para specs futuros

- **Idempotency-Key (hecho en el 003, US5):** columna `idempotencyKey` con índice
  único y value object `IdempotencyKey`. Una clave repetida devuelve el upload
  existente; si dos envíos chocan, el que pierde devuelve el ganador. El doble
  clic igual se evita en el frontend (007) deshabilitando el botón con `isPending`.
- **005:** si el upload ya está en un estado final (COMPLETED o FAILED), no
  procesar y borrar el mensaje (entrega duplicada).
- **005:** un error de negocio (CSV ilegible, faltan columnas) marca FAILED y
  borra el mensaje. Un error transitorio (base o storage caídos) deja el mensaje
  para reintentar. En el último intento, marcar FAILED ("no se pudo procesar
  después de N intentos") y mandar el mensaje a la DLQ, así nunca queda un upload
  en PROCESSING para siempre.
- **005:** el visibility timeout tiene que ser más largo que el procesamiento,
  para que dos workers no tomen el mismo upload a la vez.
- **005 (decidido por el autor):** si ninguna fila es válida, el upload termina
  `FAILED` ("Ninguna de las N filas es válida: revisá los errores por fila").
  Los errores por fila se guardan en una tabla nueva `RowError` (`uploadId`,
  `line`, `message`) con `IRowErrorRepository.saveForUpload` (reemplaza, como
  `ActivityData`), y se leen con su propia query: `GetUploadRowErrorsQuery` +
  handler + `GET /api/v1/uploads/:id/errors` → `{ data: [{ line, message }] }`.
  Diseño completo en Miro, frame 7 del tablero del backend.
- **005:** el handler usa `ICsvParserService` (registrado como
  `csvParserService`). Un `Left` del parser es un error de negocio (marca FAILED
  con ese mensaje y borra el mensaje); `totalRows`, `validRows.length` y
  `rowErrors.length` van a `Upload.markAsCompleted`.

## Validaciones del CSV

- Todas las columnas son obligatorias.
- `amount` debe ser un número positivo.
- `date` debe ser una fecha válida en formato `YYYY-MM-DD` (ojo:
  `new Date("2024-02-31")` no falla; validar de verdad).
- `category` y `unit` no pueden estar vacíos.

Implementado en el spec 004 (`CsvParserService`, con `csv-parse` 7.0.3):
UTF-8 obligatorio, separador coma, comillas según el estándar, `amount` estricto
(`/^\d+(\.\d+)?$/`: sin coma decimal, notación científica ni signos), un solo
motivo por fila y la línea donde empieza cada fila. Las reglas de la fila viven
en `ActivityData` y las del encabezado en `CsvHeader`: no duplicarlas.

## Endpoints

| Método | Endpoint | Respuesta |
|---|---|---|
| POST | `/api/v1/uploads` | `{ id, status, fileName, createdAt }` |
| GET | `/api/v1/uploads/:id` | `{ id, status, fileName, totalRows, processedRows, errorMessage, ... }` |
| GET | `/api/v1/uploads?page=1&limit=10` | `{ data, total, page, limit }` |
| GET | `/api/v1/uploads/:id/results` | `{ data: [{ category, amount, unit, date }] }` |

## Estructura

Se respeta el árbol de carpetas de la consigna (`backend/src/document-processing/...`,
`backend/src/shared/...`, `backend/src/workers/...`, `frontend/src/...`), con
dos agregados porque el árbol no los lista:

1. `GetUploadResultsQuery.ts`, `GetUploadResultsQueryHandler.ts` y
   `GetUploadResultsController.ts` (la consigna los pide en CQRS y en el
   endpoint `/results`).
2. `backend/src/shared/infrastructure/storage/IFileStorage.ts`, para que los
   handlers no importen la clase concreta de S3 o de disco.

El `docker-compose.yml` va en la raíz del repo.

## Plan: 7 specs con Spec Kit

La constitution va antes del 001 y recoge las reglas de arquitectura de arriba.
Cada spec describe qué y por qué, sin tecnología; el stack va en el plan.

| Spec | Qué construye | Listo cuando |
|---|---|---|
| `001-base-del-proyecto` | Docker con Postgres, Fastify + TypeScript, configuración por entorno, carpeta `shared` (`Either`, `ICommandHandler`, `IQueryHandler`, `BaseController`), manejo central de errores, contenedor de DI | `GET /health` responde y la base levanta |
| `002-dominio-y-persistencia` | Schema Prisma y migración, entidades `Upload` y `ActivityData`, `UploadStatus`, `FileName`, interfaces de repositorio, repositorios Prisma y mappers | Se guarda y se lee un `Upload`, y un cambio de estado inválido se rechaza |
| `003-subir-archivo` | `IFileStorage` y su implementación, `CreateUploadCommand` y handler, `POST /uploads`, `GET /uploads/:id`, publicación del mensaje | Un CSV subido queda `PENDING` y hay un mensaje en la cola |
| `004-parseo-y-validacion` | `CsvParserService` con las validaciones y tests unitarios | Un CSV con filas rotas devuelve válidas y errores por separado |
| `005-worker-y-procesamiento` | Consumer de la cola, `FileProcessingWorker`, `ProcessFileCommand` y handler, `FileProcessingService`, cambios de estado | El upload pasa solo a `COMPLETED` o `FAILED` y hay filas guardadas |
| `006-consultas` | Lista paginada y `GET /uploads/:id/results`, con queries y handlers | Los cuatro endpoints responden con el formato de la consigna |
| `007-frontend` | Formulario de subida, lista con badges, detalle con polling, dashboard | Todo el flujo se ve desde el navegador |

Fuera de Spec Kit, al final: diagrama AWS (`docs/arquitectura-aws.png`),
`README.md`, `USO-DE-IA.md` y `sample-data.csv` (50 filas o más).

## Cómo se ejecuta

```bash
docker compose up -d --wait # Postgres y LocalStack 4.14.0 (desde la raíz)
cd backend
npm install                 # también genera el cliente de Prisma
npm run db:deploy           # aplica las migraciones existentes
npm run dev                 # API, terminal 1
npm run worker              # worker, terminal 2
cd ../frontend
npm install
npm run dev                 # frontend, terminal 3
```

- Variables: copiar al `backend/.env` las de `backend/.env.example` (AWS, S3,
  SQS, tamaño máximo y `TEST_S3_BUCKET`). Apuntan a LocalStack; para AWS real
  ver la sección del README.
- Cambio de schema: `npm run db:migrate -- --name <nombre>` (crea la migración y
  regenera el cliente). Desde un agente no corre (terminal no interactiva): generar
  el SQL con `npx prisma migrate diff --from-config-datasource --to-schema <schema>
  --script`, guardarlo en `migrations/<timestamp>_<nombre>/migration.sql`, y correr
  `npm run db:deploy` y `npx prisma generate`. No usar `prisma migrate reset`.
- Tests: `npm run test:unit` (sin Docker), `npm run test:integration` (base
  `document_processing_test`, se crea y migra sola, y LocalStack) y `npm test`
  (todo). Verificar con el código de salida de Jest, no con un grep del resumen.

## Qué evalúan (para priorizar)

- **Red flags:** lógica de negocio en controllers, que no funcione de punta a
  punta, código que no pueda explicar, no documentar el uso de IA.
- **Bonus alcanzables:** tests unitarios del parser, Dead Letter Queue,
  reintentos con backoff, `USO-DE-IA.md` completo y honesto, diagrama de flujo
  detallado.
