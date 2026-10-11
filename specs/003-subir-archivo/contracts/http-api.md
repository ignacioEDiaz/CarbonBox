# Contrato HTTP: Subir archivo

Base URL local: `http://localhost:3000` (o el `PORT` configurado). El formato de error es el
del [spec 001](../../001-base-del-proyecto/contracts/http-api.md):
`{ "error": { "type": "...", "message": "..." } }`.

## POST /api/v1/uploads

Sube un archivo CSV y lo deja guardado, registrado y encolado para procesar. No lo procesa.

**Petición:** `multipart/form-data` con el archivo en el campo `file`. Tamaño máximo: 10 MB
(`UPLOAD_MAX_FILE_SIZE_MB`).

Header opcional (US5, si se implementa): `Idempotency-Key: <texto de hasta 255 caracteres>`.

```bash
curl -F "file=@datos.csv" http://localhost:3000/api/v1/uploads
```

**202 Accepted**: recibido y en la fila. El procesamiento todavía no empezó.

```json
{
  "id": "8b0e5c0e-3a52-4c0e-9d53-0d2a0f1c7a11",
  "status": "PENDING",
  "fileName": "datos.csv",
  "createdAt": "2026-10-11T18:30:00.000Z"
}
```

**Errores**

| Caso | Status | `type` | `message` |
|---|---|---|---|
| Sin archivo, o la petición no es multipart | 400 | `VALIDATION_ERROR` | `Falta el archivo: enviá un CSV en el campo "file"` |
| Nombre vacío | 400 | `VALIDATION_ERROR` | `El nombre del archivo no puede estar vacío` |
| No termina en `.csv` | 400 | `VALIDATION_ERROR` | `El archivo "datos.txt" debe ser un .csv con nombre (por ejemplo, datos.csv)` |
| Archivo de 0 bytes | 400 | `VALIDATION_ERROR` | `El archivo está vacío` |
| Encabezado distinto de `category,amount,unit,date` | 400 | `VALIDATION_ERROR` | `El encabezado debe ser "category,amount,unit,date" y llegó "<recibido>"` |
| Mayor que el máximo | 413 | `VALIDATION_ERROR` | `request file too large` (mensaje de Fastify) |
| No se pudo encolar (el upload queda FAILED) | 500 | `INTERNAL_ERROR` | `Error interno del servidor` |
| Falla S3 o la base | 500 | `INTERNAL_ERROR` | `Error interno del servidor` |

Garantías:

- Una subida rechazada (4xx) no deja archivo, upload ni mensaje.
- Las filas del CSV no se validan acá: un `.csv` con el encabezado correcto y filas inválidas
  se acepta y falla después, al procesarse.
- Si llegan varios archivos, se usa el primero.
- El `fileName` de la respuesta es el nombre original, sin espacios alrededor.
- Si la respuesta es 500 por no poder encolar, el upload existe y está en FAILED con el
  mensaje "No se pudo encolar el archivo para procesarlo". Aparece así en el listado del
  spec 006.

## GET /api/v1/uploads/:id

Devuelve el estado de un upload. Es el endpoint que el frontend consulta cada 3 segundos.

**200 OK**

```json
{
  "id": "8b0e5c0e-3a52-4c0e-9d53-0d2a0f1c7a11",
  "status": "PENDING",
  "fileName": "datos.csv",
  "totalRows": null,
  "processedRows": null,
  "failedRows": null,
  "errorMessage": null,
  "createdAt": "2026-10-11T18:30:00.000Z",
  "updatedAt": "2026-10-11T18:30:00.000Z"
}
```

| Campo | Cuándo tiene valor |
|---|---|
| `totalRows`, `processedRows`, `failedRows` | Solo con `status` `COMPLETED` |
| `errorMessage` | Solo con `status` `FAILED` |

**404 Not Found**: el identificador no existe o está mal formado.

```json
{ "error": { "type": "NOT_FOUND", "message": "No existe un upload con id abc" } }
```

Garantías:

- La respuesta no incluye la ubicación interna del archivo (`fileUrl`) ni el `userId`.
- Un identificador mal formado responde 404, no 500.
