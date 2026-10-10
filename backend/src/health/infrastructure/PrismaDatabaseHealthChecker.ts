import { PrismaClient } from "../../generated/prisma/client";
import { IDatabaseHealthChecker } from "../application/IDatabaseHealthChecker";

const TIMEOUT_MS = 2000;

export class PrismaDatabaseHealthChecker implements IDatabaseHealthChecker {
  constructor(private readonly prismaClient: PrismaClient) {}

  // Nunca lanza: cualquier falla de la consulta o un timeout significan "la base no responde"
  async isUp(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), TIMEOUT_MS);
    });
    const query = this.prismaClient.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );

    // Gana la que termine primero; después se limpia el timer para no dejarlo colgado
    return Promise.race([query, timeout]).finally(() => clearTimeout(timer));
  }
}
