import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "src/document-processing/infrastructure/persistence/models/schema.prisma",
  migrations: { path: "src/document-processing/infrastructure/persistence/models/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
