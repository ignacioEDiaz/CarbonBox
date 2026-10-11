import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import multipart from "@fastify/multipart";
import { AwilixContainer } from "awilix";
import Fastify, { FastifyInstance } from "fastify";
import { IConvictProps } from "../config/IConvictProps";
import { PrismaClient } from "../generated/prisma/client";
import { HealthController } from "../health/presentation/HealthController";
import { adaptRoute } from "../shared/infrastructure/http/adaptRoute";
import { registerErrorHandlers } from "../shared/infrastructure/http/errorHandler";

export class App {
  // Público para que los tests HTTP usen server.inject() sin abrir un puerto
  readonly server: FastifyInstance;

  constructor(container: AwilixContainer, { logger = true } = {}) {
    this.server = Fastify({ logger });

    this.server.addHook("onClose", async () => {
      await container.resolve<PrismaClient>("prismaClient").$disconnect();
      // Cierra las conexiones HTTP que el SDK de AWS deja abiertas para reutilizar
      container.resolve<SQSClient>("sqsClient").destroy();
      container.resolve<S3Client>("s3Client").destroy();
    });

    registerErrorHandlers(this.server);

    // Antes de las rutas: Fastify no interpreta multipart/form-data por sí solo.
    // files: 1 hace que, si llegan varios archivos, se use el primero.
    const { upload } = container.resolve<IConvictProps>("config");
    this.server.register(multipart, { limits: { fileSize: upload.maxFileSizeMb * 1024 * 1024, files: 1 } });

    this.server.get("/health", adaptRoute(container.resolve<HealthController>("healthController")));
  }

  async listen(port: number): Promise<void> {
    await this.server.listen({ port });
  }
}
