import "dotenv/config";
import { loadConfig } from "../config";
import { App } from "./App";
import { buildContainer } from "./container";

async function main(): Promise<void> {
  const config = loadConfig();
  const app = new App(buildContainer(config));

  await app.listen(config.port);

  // Cierre ordenado: Fastify deja de aceptar requests y el hook onClose desconecta Prisma
  process.on("SIGINT", () => app.server.close());
  process.on("SIGTERM", () => app.server.close());
}

void main();
