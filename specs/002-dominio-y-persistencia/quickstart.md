# Quickstart: validar el spec 002

Los comandos son para PowerShell en Windows, desde la raíz del repositorio, con el entorno del
spec 001 funcionando.

## 1. Base y migraciones (US2, FR-015, SC-003)

```powershell
docker compose up -d --wait
cd backend
Copy-Item .env.example .env      # si no existe; incluye TEST_DATABASE_URL
npm install
npm run db:deploy
```

Esperado: `All migrations have been successfully applied`.

Para ver las tablas:

```powershell
docker compose exec postgres psql -U postgres -d document_processing -c "\dt"
```

Esperado: `Upload`, `ActivityData` y `_prisma_migrations`.

Volver a correr `npm run db:deploy` no hace nada: `No pending migrations to apply`.

## 2. Reglas de dominio, sin base (US1, SC-001)

```powershell
npm run test:unit
```

Esperado: todos en verde, incluidas la matriz completa de transiciones de `UploadStatus` y las
validaciones de `FileName`, `Upload` y `ActivityData`. Ver [data-model.md](data-model.md).

## 3. Persistencia contra la base de tests (US2, US3, SC-002, SC-004, SC-005)

```powershell
npm run test:integration
```

Esperado: el `globalSetup` crea `document_processing_test` si no existe, aplica las
migraciones y los tests pasan. En particular:

- un upload guardado se lee igual, y sus transiciones siguen validándose;
- 5 filas reemplazadas por 3 dejan 3 (idempotencia);
- un lote para un upload inexistente deja 0 filas;
- 1.000 filas se guardan en menos de 2 s y se leen en menos de 1 s;
- la fecha `2024-01-15` vuelve como `2024-01-15`.

La base de desarrollo no se toca:

```powershell
docker compose exec postgres psql -U postgres -d document_processing -c "SELECT count(*) FROM \"Upload\";"
```

Esperado: `0`, salvo que hayas creado datos a mano.

## 4. Todo junto (SC-006)

```powershell
npm test
npm run typecheck
```

Esperado: unitarios, HTTP e integración en verde, ninguno salteado, y el chequeo de tipos sin
errores.
