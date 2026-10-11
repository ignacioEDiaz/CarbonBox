import { AwilixContainer } from "awilix";
import { FastifyInstance } from "fastify";
import { adaptRoute } from "../../../shared/infrastructure/http/adaptRoute";
import { CreateUploadController } from "../controllers/CreateUploadController";

// Las rutas del bounded context, cada una conectada a su controller a través de adaptRoute
export function registerDocumentProcessingRoutes(server: FastifyInstance, container: AwilixContainer): void {
  server.post("/api/v1/uploads", adaptRoute(container.resolve<CreateUploadController>("createUploadController")));
}
