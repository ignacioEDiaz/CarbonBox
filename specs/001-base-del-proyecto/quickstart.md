# Quickstart: validar el spec 001

Guía para comprobar que la base del proyecto funciona. Los comandos son para PowerShell en
Windows, desde la raíz del repositorio.

## Requisitos previos

- Docker Desktop corriendo.
- Node.js 24 o superior (`node --version`).
- El puerto 5432 libre (si hay otro Postgres local, hay que detenerlo).

## 1. Levantar la base (US1, FR-001)

```powershell
docker compose up -d --wait
```

Esperado: el comando vuelve cuando el contenedor `postgres` aparece como `healthy`.

## 2. Configurar y arrancar el servicio (US2, FR-006, FR-007)

```powershell
cd backend
Copy-Item .env.example .env
npm install            # también corre "prisma generate" (postinstall)
npm run dev
```

Esperado: el log muestra que el servidor escucha en el puerto 3000.

## 3. Chequeo de salud (US1, FR-003, SC-002)

En otra terminal:

```powershell
curl.exe -i http://localhost:3000/health
```

Esperado: `200` y `{"service":"up","database":"up"}` en menos de 1 s.

## 4. Base caída y recuperación (US1, FR-004, FR-005)

```powershell
docker compose stop postgres
curl.exe -i http://localhost:3000/health     # 503 {"service":"up","database":"down"} en < 5 s
docker compose start postgres
curl.exe -i http://localhost:3000/health     # 200 de nuevo, sin reiniciar el servicio
```

## 5. Persistencia (US1, FR-002, SC-003)

```powershell
docker compose exec postgres psql -U postgres -d document_processing -c "CREATE TABLE IF NOT EXISTS ping (id int); INSERT INTO ping VALUES (1);"
docker compose down          # sin -v: el volumen se conserva
docker compose up -d --wait
docker compose exec postgres psql -U postgres -d document_processing -c "SELECT * FROM ping;"
docker compose exec postgres psql -U postgres -d document_processing -c "DROP TABLE ping;"
```

Esperado: el `SELECT` devuelve la fila `1`.

## 6. Configuración inválida (US2, FR-008, SC-004)

Con el servicio detenido, en `backend/`:

| Cambio en `.env` | Resultado esperado de `npm run dev` |
|---|---|
| Borrar la línea `DATABASE_URL` | No arranca; el mensaje nombra `database.url` |
| `PORT=abc` | No arranca; el mensaje nombra `port` y el rango válido |
| `PORT` igual a un puerto ocupado | No arranca; el mensaje indica el puerto en uso |

Después de probar, restaurar `.env` desde `.env.example`.

## 7. Formato de errores (US3, FR-012, SC-005)

```powershell
curl.exe -i http://localhost:3000/no-existe
```

Esperado: `404` con `{"error":{"type":"NOT_FOUND","message":"..."}}`. Ver
[contracts/http-api.md](contracts/http-api.md).

## 8. Tests (US3, FR-015, SC-006)

```powershell
npm test
npm run typecheck
```

Esperado: todos los tests en verde, ninguno salteado, y el chequeo de tipos sin errores.
