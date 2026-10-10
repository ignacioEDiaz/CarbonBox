import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";

// No llama a $connect(): Prisma se conecta en la primera consulta, así el servicio
// arranca aunque la base esté apagada y se recupera solo cuando vuelve.
export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}
