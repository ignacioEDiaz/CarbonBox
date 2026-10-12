import { asClass, AwilixContainer } from "awilix";
import { RegisterUserCommandHandler } from "../../application/commands/handlers/RegisterUserCommandHandler";
import { LoginQueryHandler } from "../../application/queries/handlers/LoginQueryHandler";
import { LoginController } from "../../presentation/LoginController";
import { RegisterUserController } from "../../presentation/RegisterUserController";
import { PrismaUserRepository } from "../persistence/PrismaUserRepository";
import { ScryptPasswordHasher } from "../security/ScryptPasswordHasher";

// Registra las piezas del bounded context auth. tokenService se registra en el contenedor
// principal porque también lo usan las rutas protegidas de document-processing.
export function registerAuthModule(container: AwilixContainer): void {
  container.register({
    userRepository: asClass(PrismaUserRepository).singleton(),
    passwordHasher: asClass(ScryptPasswordHasher).singleton(),
    registerUserCommandHandler: asClass(RegisterUserCommandHandler).singleton(),
    loginQueryHandler: asClass(LoginQueryHandler).singleton(),
    registerUserController: asClass(RegisterUserController).singleton(),
    loginController: asClass(LoginController).singleton(),
  });
}
