import "dotenv/config";
import { execSync } from "node:child_process";
import path from "node:path";

// Corre una vez antes de los tests de integración: crea la base de tests si no existe
// y le aplica las migraciones. Nunca toca la base de desarrollo.
export default function globalSetup(): void {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error("Falta TEST_DATABASE_URL en backend/.env (ver .env.example)");
  }

  try {
    execSync("npx prisma migrate deploy", {
      cwd: path.resolve(__dirname, "../.."),
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      stdio: "pipe",
    });
  } catch (error) {
    const detail = error instanceof Error && "stderr" in error ? String(error.stderr) : String(error);
    throw new Error(`No se pudo preparar la base de tests. ¿Está levantada? (docker compose up -d --wait)\n${detail}`);
  }
}
