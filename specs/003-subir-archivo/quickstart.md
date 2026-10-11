# Quickstart: validar el spec 003

Comandos para PowerShell en Windows. Los de Docker van desde la raíz del repositorio y los de
npm desde `backend/`. Hace falta el entorno de los specs 001 y 002 funcionando y Docker
Desktop prendido.

## 1. Preparar

```powershell
docker compose up -d --wait
```

Esperado: `postgres` y `localstack` en estado `Healthy`. El primer arranque descarga la imagen
`localstack/localstack:4.14.0`.

```powershell
docker compose exec localstack awslocal sqs list-queues
docker compose exec localstack awslocal s3 ls
```

Esperado: la cola `uploads` y los buckets `carbonbox-uploads` y `carbonbox-uploads-test`,
creados por `localstack/ready.d/init-aws.sh`.

Copiar a `backend/.env` las variables nuevas de `backend/.env.example` (las de AWS, S3, SQS y
`UPLOAD_MAX_FILE_SIZE_MB`). Después:

```powershell
cd backend
npm install
npm run db:deploy
```

## 2. Subir un archivo (US1, SC-001, SC-002)

En una terminal, la API: `npm run dev`. En otra, desde `backend/`:

```powershell
Set-Content datos.csv "category,amount,unit,date`nElectricity,150.5,kWh,2024-01-15"
curl.exe -i -F "file=@datos.csv" http://localhost:3000/api/v1/uploads
```

Esperado: `HTTP/1.1 202 Accepted` con `id`, `"status":"PENDING"`, `"fileName":"datos.csv"` y
`createdAt`. Anotá el `id`.

Las tres cosas que tiene que haber dejado (desde la raíz):

```powershell
# 1. El archivo en S3, con una clave generada (no "datos.csv")
docker compose exec localstack awslocal s3 ls s3://carbonbox-uploads/uploads/

# 2. El upload en PENDING, apuntando a esa clave
docker compose exec postgres psql -U postgres -d document_processing -c "SELECT id, status, \"fileName\", \"fileUrl\" FROM \"Upload\" ORDER BY \"createdAt\" DESC LIMIT 1;"

# 3. Un mensaje en la cola (contar sin consumirlo)
docker compose exec localstack awslocal sqs get-queue-attributes --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/uploads --attribute-names ApproximateNumberOfMessages
```

## 3. Subidas rechazadas (US1, SC-003, SC-003a)

```powershell
# Sin archivo
curl.exe -i -X POST http://localhost:3000/api/v1/uploads

# Extensión inválida
Set-Content datos.txt "category,amount,unit,date"
curl.exe -i -F "file=@datos.txt" http://localhost:3000/api/v1/uploads

# Archivo vacío
New-Item vacio.csv -ItemType File -Force | Out-Null
curl.exe -i -F "file=@vacio.csv" http://localhost:3000/api/v1/uploads

# Encabezado incorrecto
Set-Content mal.csv "fecha,monto`n2024-01-15,10"
curl.exe -i -F "file=@mal.csv" http://localhost:3000/api/v1/uploads
```

Esperado: `400` en los cuatro, con `"type":"VALIDATION_ERROR"`. El último dice qué encabezado
se esperaba y cuál llegó. Repetir las tres consultas del paso 2: no aparecieron archivos,
uploads ni mensajes nuevos.

Encabezado con mayúsculas y espacios (se acepta):

```powershell
Set-Content raro.csv "Category, Amount ,UNIT,date`nWater,1,m3,2024-01-15"
curl.exe -i -F "file=@raro.csv" http://localhost:3000/api/v1/uploads
```

Esperado: `202`.

## 4. Consultar el estado (US2, SC-004)

```powershell
curl.exe -i http://localhost:3000/api/v1/uploads/<id-del-paso-2>
curl.exe -i http://localhost:3000/api/v1/uploads/abc
```

Esperado: `200` con `status` `PENDING`, conteos y `errorMessage` en `null`, sin `fileUrl`; y
`404` con `"type":"NOT_FOUND"` para `abc`.

## 5. Cola caída: el upload queda FAILED (US1 escenario 12)

Con la API corriendo, desde la raíz:

```powershell
docker compose stop localstack
curl.exe -i -F "file=@datos.csv" http://localhost:3000/api/v1/uploads
docker compose up -d --wait
```

Esperado: `500` con `"type":"INTERNAL_ERROR"`. Como S3 también está caído, en este caso la
subida falla al guardar el archivo y no se crea upload. El camino "S3 anda pero SQS no" (upload
en FAILED con "No se pudo encolar el archivo para procesarlo") lo cubren los tests del handler
con un publisher que falla.

## 6. La cola entre procesos y la integración con LocalStack (US3, SC-005, SC-006)

```powershell
npm run test:integration
```

Esperado, entre otros:

- `SqsMessageQueue.test.ts`: cola vacía devuelve `null`; dos mensajes en orden con
  `receiveCount` 1; oculto mientras dura el ocultamiento; vuelve con `receiveCount` 2 al
  vencer; `delete` dos veces sin error; 20 consumidores sobre 5 mensajes entregan 5
  distintos.
- `S3FileStorage.test.ts`: `save` y `read` devuelven los mismos bytes (con BOM, `\r\n` y `ñ`);
  `read` de una ubicación inexistente lanza.
- `uploadFlow.test.ts`: una subida por HTTP deja un archivo igual al enviado, un upload en
  PENDING y un mensaje con su `id`.

## 7. Configuración (US4, escenarios 1 y 3)

```powershell
$env:S3_BUCKET = ""; npm run dev
```

Esperado: el servicio no arranca y el error nombra `storage.bucket`. Limpiar con
`Remove-Item Env:S3_BUCKET`.

El escenario 2 de US4 (AWS real) se valida cuando el autor conecte su cuenta: vaciar
`AWS_ENDPOINT_URL`, poner región, bucket, URL de la cola y credenciales de un usuario IAM, y
repetir los pasos 2 y 4.

## 8. Todo junto (SC-008)

```powershell
npm test
npm run typecheck
```

Esperado: unitarios, HTTP e integración en verde, ninguno salteado, y el chequeo de tipos sin
errores.

Limpiar los archivos de prueba:

```powershell
Remove-Item datos.csv, datos.txt, vacio.csv, mal.csv, raro.csv
```
