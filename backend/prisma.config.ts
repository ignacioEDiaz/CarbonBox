import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "src/document-processing/infrastructure/persistence/models/schema.prisma",
  datasource: { url: env("DATABASE_URL") },
});
