import "dotenv/config";
import { loadConfig } from "../config";
import { IConvictProps } from "../config/IConvictProps";
import { App } from "./App";
import { buildContainer } from "./container";

// Arranque del proceso: es el único lugar con try/catch, porque un error acá
// no es una request sino un motivo para no arrancar.
async function main(): Promise<void> {
  const config = loadConfigOrExit();
  const app = new App(buildContainer(config));

  try {
    await app.listen(config.port);
  } catch (error) {
    exitWithError(isAddressInUse(error) ? `El puerto ${config.port} ya está en uso` : String(error));
  }

  // Cierre ordenado: Fastify deja de aceptar requests y el hook onClose desconecta Prisma
  process.on("SIGINT", () => app.server.close());
  process.on("SIGTERM", () => app.server.close());
}

function loadConfigOrExit(): IConvictProps {
  try {
    return loadConfig();
  } catch (error) {
    return exitWithError(`Configuración inválida:\n${error instanceof Error ? error.message : error}`);
  }
}

function isAddressInUse(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EADDRINUSE";
}

function exitWithError(message: string): never {
  console.error(message);
  process.exit(1);
}

void main();
