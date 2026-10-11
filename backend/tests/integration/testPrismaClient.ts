import { createPrismaClient } from "../../src/shared/infrastructure/persistence/createPrismaClient";

// Cliente apuntando a la base de tests, nunca a la de desarrollo
export function createTestPrismaClient() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error("Falta TEST_DATABASE_URL en backend/.env (ver .env.example)");
  }
  return createPrismaClient(testDatabaseUrl);
}
