import "dotenv/config";
import { execSync } from "node:child_process";
import path from "node:path";

const HINT = "¿Está levantado? (docker compose up -d --wait)";

// Corre una vez antes de los tests de integración: prepara la base de tests y verifica que
// LocalStack responda. Nunca toca la base de desarrollo.
export default async function globalSetup(): Promise<void> {
  migrateTestDatabase();
  await checkLocalStack();
}

// Crea la base de tests si no existe y le aplica las migraciones
function migrateTestDatabase(): void {
  const testDatabaseUrl = requireEnv("TEST_DATABASE_URL");
  try {
    execSync("npx prisma migrate deploy", {
      cwd: path.resolve(__dirname, "../.."),
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      stdio: "pipe",
    });
  } catch (error) {
    const detail = error instanceof Error && "stderr" in error ? String(error.stderr) : String(error);
    throw new Error(`No se pudo preparar la base de tests. ${HINT}\n${detail}`);
  }
}

async function checkLocalStack(): Promise<void> {
  requireEnv("TEST_S3_BUCKET");
  const endpoint = requireEnv("AWS_ENDPOINT_URL");
  const response = await fetch(`${endpoint}/_localstack/health`).catch(() => null);
  if (response === null || !response.ok) {
    throw new Error(`No responde LocalStack en ${endpoint}. ${HINT}`);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta ${name} en backend/.env (ver .env.example)`);
  }
  return value;
}
