import { asClass, asValue, AwilixContainer, createContainer, InjectionMode } from "awilix";
import { IConvictProps } from "../config/IConvictProps";
import { GetHealthQueryHandler } from "../health/application/GetHealthQueryHandler";
import { PrismaDatabaseHealthChecker } from "../health/infrastructure/PrismaDatabaseHealthChecker";
import { HealthController } from "../health/presentation/HealthController";
import { createPrismaClient } from "../shared/infrastructure/persistence/createPrismaClient";

// CLASSIC: Awilix inyecta según el nombre del parámetro del constructor.
// strict: falla al resolver si falta un registro o si las vidas no son compatibles.
export function buildContainer(config: IConvictProps): AwilixContainer {
  const container = createContainer({ injectionMode: InjectionMode.CLASSIC, strict: true });

  container.register({
    config: asValue(config),
    prismaClient: asValue(createPrismaClient(config.database.url)),

    databaseHealthChecker: asClass(PrismaDatabaseHealthChecker).singleton(),
    getHealthQueryHandler: asClass(GetHealthQueryHandler).singleton(),
    healthController: asClass(HealthController).singleton(),
  });

  return container;
}
