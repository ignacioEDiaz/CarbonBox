import { AwilixContainer } from "awilix";
import { FastifyInstance } from "fastify";
import { adaptRoute } from "../../shared/infrastructure/http/adaptRoute";
import { LoginController } from "./LoginController";
import { RegisterUserController } from "./RegisterUserController";

// Las únicas rutas de la API que no piden token, además de /health
export function registerAuthRoutes(server: FastifyInstance, container: AwilixContainer): void {
  server.post("/api/v1/auth/register", adaptRoute(container.resolve<RegisterUserController>("registerUserController")));
  server.post("/api/v1/auth/login", adaptRoute(container.resolve<LoginController>("loginController")));
}
