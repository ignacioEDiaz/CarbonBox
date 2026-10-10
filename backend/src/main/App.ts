import { AwilixContainer } from "awilix";
import Fastify, { FastifyInstance } from "fastify";
import { PrismaClient } from "../generated/prisma/client";

export class App {
  // Público para que los tests HTTP usen server.inject() sin abrir un puerto
  readonly server: FastifyInstance;

  constructor(container: AwilixContainer) {
    this.server = Fastify({ logger: true });

    this.server.addHook("onClose", async () => {
      await container.resolve<PrismaClient>("prismaClient").$disconnect();
    });
  }

  async listen(port: number): Promise<void> {
    await this.server.listen({ port });
  }
}
