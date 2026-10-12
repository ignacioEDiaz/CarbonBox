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
| [002-dominio-y-persistencia](specs/002-dominio-y-persistencia/) | Entidades `Upload` y `ActivityData`, estados, schema, migración y repositorios | ✅ Completo |
| [003-subir-archivo](specs/003-subir-archivo/) | Subida de CSV a S3, upload en PENDING, aviso en SQS (LocalStack), consulta por id | ✅ Completo |
| [004-parseo-y-validacion](specs/004-parseo-y-validacion/) | `CsvParserService`: filas válidas, errores por fila con línea y motivo, errores de archivo | ✅ Completo (lo conecta el 005) |
| [005-worker-y-procesamiento](specs/005-worker-y-procesamiento/) | Worker (`npm run worker`): procesa el CSV, guarda filas y errores por fila, COMPLETED o FAILED, reintentos y DLQ | ✅ Completo |
| [006-consultas](specs/006-consultas/) | Lista paginada de uploads y resultados de un upload | ✅ Completo |
| [007-frontend-y-login](specs/007-frontend-y-login/) | Login con JWT, rutas protegidas por usuario y frontend en Next.js | ✅ Completo (el diseño visual llega después) |

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) corriendo.
- Node.js 24 o superior.
- Los puertos 5432 (Postgres), 4566 (LocalStack) y 3000 (API) libres.

## Cómo levantarlo

Desde la raíz del repositorio (PowerShell o bash):

```bash
docker compose up -d --wait        # PostgreSQL 15 y LocalStack (S3 + SQS), espera a que estén listos
cd backend
cp .env.example .env               # en PowerShell: Copy-Item .env.example .env
npm install                        # también genera el cliente de Prisma
npm run db:deploy                  # crea las tablas (aplica las migraciones)
npm run dev                        # API en http://localhost:3000
npm run worker                     # en otra terminal: procesa los archivos subidos
```

El frontend, en otra terminal (pide que la API esté corriendo):

```bash
cd frontend
npm install
npm run dev                        # http://localhost:3001: registrate, iniciá sesión y subí un CSV
```

Next reenvía `/api/*` a la API (`API_URL`, por defecto `http://localhost:3000`), así que no hace
falta CORS. En `backend/.env` tiene que estar `JWT_SECRET` (mínimo 32 caracteres, ver
`.env.example`).

Comprobar que todo responde:

```bash
curl http://localhost:3000/health
# {"service":"up","database":"up"}

curl -F "file=@datos.csv" http://localhost:3000/api/v1/uploads
# 202 {"id":"...","status":"PENDING","fileName":"datos.csv","createdAt":"..."}
```

La guía completa de verificación, incluida la base caída, la persistencia y los errores de
configuración, está en los quickstart de cada spec: [001](specs/001-base-del-proyecto/quickstart.md),
[002](specs/002-dominio-y-persistencia/quickstart.md), [003](specs/003-subir-archivo/quickstart.md)
y [004](specs/004-parseo-y-validacion/quickstart.md).

## Arquitectura en AWS

Cómo se desplegaría en AWS (VPC, ALB, ECS Fargate con API y worker, RDS Multi-AZ, S3, SQS con
DLQ, CloudWatch y Secrets Manager), con el diagrama y el porqué de cada pieza:
[docs/arquitectura-aws.md](docs/arquitectura-aws.md).

## S3 y SQS: LocalStack en local, AWS después

Los archivos van a S3 y los avisos de procesamiento a SQS. En local, los dos corren en
[LocalStack](https://www.localstack.cloud/) dentro de Docker, fijado en la versión **4.14.0**:
desde la 2026.03.0, `localstack/localstack:latest` exige una cuenta y un token de LocalStack,
y la 4.14.0 es la última que arranca sin ellos. Así cualquiera que clone el repositorio lo
levanta con un comando. El script [`localstack/ready.d/init-aws.sh`](localstack/ready.d/init-aws.sh)
crea la cola y los buckets al arrancar. El código usa el SDK oficial de
AWS y es el mismo en los dos casos: lo único que cambia es la configuración.

### Pasar de LocalStack a AWS

1. Crear el bucket y la cola en la cuenta de AWS (con la AWS CLI o desde la consola):

   ```bash
   aws s3 mb s3://<tu-bucket> --region us-east-1
   aws sqs create-queue --queue-name uploads --region us-east-1   # devuelve la QueueUrl
   ```

2. Crear un usuario IAM solo para la aplicación, nunca usar la cuenta raíz, con permisos
   mínimos: `s3:PutObject` y `s3:GetObject` sobre `arn:aws:s3:::<tu-bucket>/uploads/*`, y
   `sqs:SendMessage`, `sqs:ReceiveMessage` y `sqs:DeleteMessage` sobre la cola.
3. Cambiar `backend/.env`. Ese archivo no se versiona, así que las credenciales nunca llegan al
   repositorio:

   | Variable | LocalStack | AWS |
   |---|---|---|
   | `AWS_ENDPOINT_URL` | `http://localhost:4566` | vacía |
   | `AWS_REGION` | `us-east-1` | la región del bucket y la cola |
   | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | `test` / `test` | las del usuario IAM |
   | `S3_BUCKET` | `carbonbox-uploads` | `<tu-bucket>` |
   | `SQS_QUEUE_URL` | `http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/uploads` | la `QueueUrl` del paso 1 |

No hay que tocar código. El tiempo de ocultamiento de los mensajes
(`SQS_VISIBILITY_TIMEOUT_SECONDS`) se manda en cada pedido, así que tampoco hace falta
configurarlo en la cola. Si falta una variable obligatoria, la API no arranca y el error dice
cuál falta.

## Scripts (`backend/`)

| Script | Qué hace |
|---|---|
| `npm run dev` | Corre la API con recarga automática (`tsx watch`) |
| `npm run worker` | Corre el worker: consume SQS (cada 3 s si la cola está vacía) y procesa cada upload |
| `npm test` | Corre todos los tests (unitarios, HTTP y de integración) |
| `npm run test:unit` | Solo unitarios y HTTP: no necesita Docker |
| `npm run test:integration` | Repositorios, S3, SQS y la subida completa contra la base de tests `document_processing_test` y LocalStack (necesita Docker). La base se crea y se migra sola |
| `npm run test:watch` | Tests en modo watch, para el ciclo de TDD |
| `npm run typecheck` | Chequea tipos con `tsc` sin generar archivos |
| `npm run db:deploy` | Aplica las migraciones existentes (lo que corre quien clona el repo) |
| `npm run db:migrate -- --name <nombre>` | Crea una migración nueva después de cambiar el schema y regenera el cliente |

## API

| Método | Endpoint | Respuesta |
|---|---|---|
| GET | `/health` | `200 {"service":"up","database":"up"}`; `503` si la base no responde |
| POST | `/api/v1/uploads` | `202 { id, status, fileName, createdAt }`. Multipart con el archivo en `file`; header opcional `Idempotency-Key` |
| GET | `/api/v1/uploads/:id` | `200 { id, status, fileName, totalRows, processedRows, failedRows, errorMessage, createdAt, updatedAt }`; `404` si no existe |
| POST | `/api/v1/auth/register` | `201 { id, email }` con `{ email, password }` (contraseña de 8 a 72 caracteres); `409` si el email ya existe |
| POST | `/api/v1/auth/login` | `200 { token }` (JWT, vence en 1 h); `401` con credenciales incorrectas, sin decir cuál falló |
| GET | `/api/v1/uploads/activity-by-month` | `200 { data: [{ year, month, rows }] }`: filas de actividad del usuario por mes (gráfico del dashboard). Cuenta filas en vez de sumar `amount`, porque cada categoría usa otra unidad |
| GET | `/api/v1/uploads/summary` | `200 { total, pending, processing, completed, failed }` del usuario (dashboard) |
| GET | `/api/v1/uploads?page=1&limit=10` | `200 { data, total, page, limit }`: los uploads del usuario, del más nuevo al más viejo. `page` ≥ 1 (por defecto 1), `limit` de 1 a 100 (por defecto 10); fuera de rango, `400` |
| GET | `/api/v1/uploads/:id/results` | `200 { data: [{ category, amount, unit, date }] }`, ordenados por fecha y categoría; `404` si no existe |
| GET | `/api/v1/uploads/:id/errors` | `200 { data: [{ line, message }] }`, los errores por fila ordenados por línea; `404` si no existe |

La subida solo valida lo instantáneo: que haya archivo, que no esté vacío, que pese hasta
10 MB, que termine en `.csv` y que la primera línea sea `category,amount,unit,date`. Las filas
se validan después, en el worker. El orden es guardar el archivo en S3, registrar el upload en
la base y recién después publicar el aviso en SQS: así el worker nunca recibe el id de un
upload que todavía no existe (la consigna los lista al revés). Si no se puede publicar, el
upload queda FAILED con "No se pudo encolar el archivo para procesarlo" y la API responde 500.
Contrato completo: [http-api.md](specs/003-subir-archivo/contracts/http-api.md).

Todos los errores comparten el formato `{ "error": { "type", "message" } }`: ver el
[contrato](specs/001-base-del-proyecto/contracts/http-api.md).

## Modelo de datos

Dos tablas en PostgreSQL ([detalle](specs/002-dominio-y-persistencia/data-model.md)):

- **`Upload`:** el archivo subido y su procesamiento (nombre, ubicación, estado, usuario,
  conteos de filas, mensaje de error y fechas).
- **`ActivityData`:** cada fila válida del CSV (categoría, cantidad, unidad y fecha),
  vinculada a su upload.

Estados del upload. Las reglas viven en la entidad `Upload`, no en la base ni en los
controllers:

```text
PENDING ──► PROCESSING ──► COMPLETED
   │           │  ▲
   │           │  └── reintento (el worker se cayó y el mensaje volvió a la cola)
   │           └────► FAILED
   └── no se pudo encolar ──► FAILED
```

COMPLETED y FAILED son finales. Guardar las filas de un upload **reemplaza** las de un intento
anterior en una sola transacción, así que procesar dos veces el mismo upload da el mismo
resultado (idempotencia por `uploadId`).

## Sesión (login con JWT)

Todas las rutas de `/api/v1/uploads` piden `Authorization: Bearer <token>`; sin token válido
responden `401`. Cada usuario ve y procesa solo sus uploads: uno ajeno responde `404`, igual
que uno inexistente, para no confirmar que existe. Las contraseñas se guardan con `scrypt` y
sal aleatoria (nunca en texto plano), y el token se firma con HS256 y un secreto de al menos 32
caracteres. Los uploads creados antes de este cambio quedaron a nombre de `user-123`, que no es
una cuenta: nadie los ve.

## Procesamiento (worker)

`npm run worker` es un proceso aparte de la API, con el mismo contenedor de dependencias. Hace
polling a SQS (si la cola está vacía, espera 3 s) y por cada mensaje `{ uploadId }`:

1. `FileProcessingWorker` traduce el mensaje a `ProcessFileCommand` (sin lógica de negocio).
2. `ProcessFileCommandHandler` busca el upload; si no existe o ya terminó (entrega duplicada),
   no procesa. Si no, lo marca PROCESSING.
3. `FileProcessingService` baja el CSV de S3, lo parsea con `CsvParserService` y guarda las
   filas válidas (`ActivityData`) y los errores por fila (`RowError`), reemplazando los de un
   intento anterior.
4. El handler marca **COMPLETED** con los conteos, o **FAILED** si el parser rechazó el archivo o
   si ninguna fila es válida.
5. El worker borra el mensaje recién al final.

Si S3 o Postgres fallan, el mensaje no se borra y SQS lo reentrega a los 60 s. En el tercer
intento el upload queda FAILED ("No se pudo procesar después de 3 intentos"); si ni eso se
puede, la redrive policy mueve el mensaje a la DLQ `uploads-dlq`. Diseño paso a paso:
[spec 005](specs/005-worker-y-procesamiento/) y el frame 7 del tablero de Miro.

## Formato del CSV y validaciones

`CsvParserService` convierte el archivo subido en filas de `ActivityData`. Lo va a usar el
worker (spec 005); hoy se prueba con sus tests unitarios
([quickstart](specs/004-parseo-y-validacion/quickstart.md)).

**Qué acepta:** texto UTF-8 (la opción "CSV UTF-8" de Excel), separado por comas, con el
encabezado `category,amount,unit,date` en ese orden (sin importar mayúsculas, espacios, BOM ni
saltos de línea de Windows). Los valores pueden ir entre comillas, con comas o comillas dobles
adentro, como define el estándar CSV. Las líneas vacías se ignoran.

**Errores de archivo** (no se procesa ninguna fila): no es UTF-8, el encabezado es otro (por
ejemplo, separado por punto y coma), las comillas están mal cerradas o no hay filas de datos.

**Errores de fila** (el resto del archivo se procesa igual): cada uno dice la línea del archivo
donde empieza la fila, contando el encabezado como la 1, como en una planilla, y un único
motivo:

| Regla | Ejemplo rechazado |
|---|---|
| 4 columnas | `Gas,10,m3` |
| `category` y `unit` no vacías | `,10,kWh,2024-03-01` |
| `amount`: solo dígitos y punto decimal, mayor que cero | `12,5`, `1e3`, `-5`, `0`, `12kg` |
| `date`: `YYYY-MM-DD` y un día que exista | `2024-02-31`, `31/01/2024` |

Las reglas de la fila son las de la entidad `ActivityData` y la del encabezado es la de
`CsvHeader`, la misma que usa la subida: el parser no las duplica. Decisiones, con lo que se
probó de la biblioteca `csv-parse` antes de usarla:
[research.md](specs/004-parseo-y-validacion/research.md).

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
| `status` como enum de Postgres (la consigna usa `String`) | La base rechaza estados inválidos |
| `date` como `DATE` (`@db.Date`) | Es un día, no un instante: no se corre por zona horaria |
| Índice en `ActivityData.uploadId` | Leer y reemplazar las filas de un upload es la operación más frecuente |
| `Upload.idempotencyKey` con índice único | Un reintento de la subida con el mismo header `Idempotency-Key` no crea un segundo upload, aunque lleguen dos a la vez |
| `CsvHeader` e `IdempotencyKey` en `domain/value-objects/` | Reglas del negocio: el encabezado lo comparten la subida y el parser (spec 004) |
| `shared/infrastructure/aws/createAwsClients.ts` | Un solo lugar arma los clientes de S3 y SQS (LocalStack o AWS según el endpoint) |
| `localstack/ready.d/` y `.gitattributes` | Crean la cola y los buckets al arrancar; el `.sh` necesita fin de línea LF aunque se clone en Windows |
| `src/workers/index.ts` | Arranque del worker: el bucle de polling necesita `try/catch` y la constitución no lo permite en el worker |
| Tabla `RowError` y `GET /api/v1/uploads/:id/errors` | Los errores por fila se guardan y se consultan (decisión del autor) |
| `application/services/ICsvParserService.ts` | El handler de procesamiento (spec 005) depende de esta interfaz y no de `CsvParserService` |

Las decisiones técnicas, con sus alternativas descartadas, están en
[research.md](specs/001-base-del-proyecto/research.md).

## Limitaciones conocidas

- **`npm audit` reporta vulnerabilidades altas en dependencias transitivas:** `braces` y
  `micromatch` vía `fast-glob` en Awilix, y `deepmerge-ts` y `mysql2` en la CLI de Prisma. El
  arreglo que propone npm es bajar a versiones mayores anteriores (Awilix 6, Prisma 6), y no se
  aplicó. Ninguna procesa datos que envía el usuario: `fast-glob` solo lo usa
  `loadModules` de Awilix (no se usa), y `deepmerge-ts` y `mysql2` son parte de la CLI de
  Prisma (se usa PostgreSQL).
- **LocalStack 4.14.0 no recibe parches de seguridad.** Es un emulador que solo escucha en
  `localhost` mientras se desarrolla; en producción se usan S3 y SQS reales.
- **LocalStack no guarda nada entre reinicios** (la persistencia es paga). Al reiniciar el
  contenedor se pierden los archivos y los mensajes, y un upload que quedó en PENDING apunta a
  un archivo que ya no existe. Es solo del entorno local.
- **Si fallan a la vez la cola y la base**, el upload no se puede marcar FAILED y queda en
  PENDING sin aviso. La solución estándar es el patrón *outbox*: guardar el upload y el aviso
  pendiente en la misma transacción y que otro proceso lo publique.
- **Archivos huérfanos en S3:** si falla registrar el upload después de subir el archivo, o
  pierde una carrera de `Idempotency-Key`, el archivo queda sin upload. En producción los
  limpiaría una *lifecycle policy* del bucket.
- **El error de archivo demasiado grande (413) llega en inglés** (`request file too large`):
  lo genera Fastify y el manejador central lo pasa tal cual.
- **El CSV tiene que ser UTF-8 y separado por comas.** Un archivo exportado de Excel en español
  (punto y coma) o en otra codificación se rechaza con un mensaje que lo explica, en vez de
  intentar adivinar el formato.
- **Una fila con varios problemas informa uno solo**, el primero que encuentra. Alcanza para
  corregirla, pero puede hacer falta más de una vuelta.
- **Con comillas mal cerradas no se sabe la línea exacta:** una comilla abierta se come el resto
  del archivo, así que el error dice "después de la línea N", la última fila leída bien.
- **Los tests corren con `--experimental-vm-modules`.** `fastify.inject` depende de un paquete
  ESM puro (`cookie@2`) y Jest 30 solo puede cargarlo con esa bandera de Node (ver
  [research.md §3](specs/001-base-del-proyecto/research.md)).

## Uso de IA

Qué se generó con IA, qué se corrigió y qué se aprendió: [USO-DE-IA.md](USO-DE-IA.md).
