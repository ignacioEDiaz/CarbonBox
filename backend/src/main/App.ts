import { AwilixContainer } from "awilix";
import Fastify, { FastifyInstance } from "fastify";
import { PrismaClient } from "../generated/prisma/client";
import { HealthController } from "../health/presentation/HealthController";
import { adaptRoute } from "../shared/infrastructure/http/adaptRoute";

export class App {
  // Público para que los tests HTTP usen server.inject() sin abrir un puerto
  readonly server: FastifyInstance;

  constructor(container: AwilixContainer, { logger = true } = {}) {
    this.server = Fastify({ logger });

    this.server.addHook("onClose", async () => {
      await container.resolve<PrismaClient>("prismaClient").$disconnect();
    });

    this.server.get("/health", adaptRoute(container.resolve<HealthController>("healthController")));
  }

  async listen(port: number): Promise<void> {
    await this.server.listen({ port });
  }
}
