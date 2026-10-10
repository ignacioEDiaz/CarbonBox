import { asValue, AwilixContainer, createContainer, InjectionMode } from "awilix";
import { IConvictProps } from "../config/IConvictProps";
import { createPrismaClient } from "../shared/infrastructure/persistence/createPrismaClient";

// CLASSIC: Awilix inyecta según el nombre del parámetro del constructor.
// strict: falla al resolver si falta un registro o si las vidas no son compatibles.
export function buildContainer(config: IConvictProps): AwilixContainer {
  const container = createContainer({ injectionMode: InjectionMode.CLASSIC, strict: true });

  container.register({
    config: asValue(config),
    prismaClient: asValue(createPrismaClient(config.database.url)),
  });

  return container;
}
