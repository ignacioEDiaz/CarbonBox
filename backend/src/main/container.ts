import { asClass, asValue, AwilixContainer, createContainer, InjectionMode } from "awilix";
import { registerAuthModule } from "../auth/infrastructure/dependency-injection/AuthModule";
import { IConvictProps } from "../config/IConvictProps";
import { registerDocumentProcessingModule } from "../document-processing/infrastructure/dependency-injection/DocumentProcessingModule";
import { GetHealthQueryHandler } from "../health/application/GetHealthQueryHandler";
import { PrismaDatabaseHealthChecker } from "../health/infrastructure/PrismaDatabaseHealthChecker";
import { HealthController } from "../health/presentation/HealthController";
import { createAwsClients } from "../shared/infrastructure/aws/createAwsClients";
import { createPrismaClient } from "../shared/infrastructure/persistence/createPrismaClient";
import { JwtTokenService } from "../shared/infrastructure/security/JwtTokenService";

// CLASSIC: Awilix inyecta según el nombre del parámetro del constructor.
// strict: falla al resolver si falta un registro o si las vidas no son compatibles.
export function buildContainer(config: IConvictProps): AwilixContainer {
  const container = createContainer({ injectionMode: InjectionMode.CLASSIC, strict: true });
  const { sqsClient, s3Client } = createAwsClients(config.aws);

  container.register({
    config: asValue(config),
    prismaClient: asValue(createPrismaClient(config.database.url)),
    sqsClient: asValue(sqsClient),
    s3Client: asValue(s3Client),

    databaseHealthChecker: asClass(PrismaDatabaseHealthChecker).singleton(),
    getHealthQueryHandler: asClass(GetHealthQueryHandler).singleton(),
    healthController: asClass(HealthController).singleton(),
    tokenService: asClass(JwtTokenService).singleton(),
  });
  registerAuthModule(container);
  registerDocumentProcessingModule(container);

  return container;
}
