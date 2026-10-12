import { AwilixContainer } from "awilix";
import { FastifyInstance } from "fastify";
import { adaptRoute } from "../../../shared/infrastructure/http/adaptRoute";
import { CreateUploadController } from "../controllers/CreateUploadController";
import { GetUploadByIdController } from "../controllers/GetUploadByIdController";
import { GetUploadResultsController } from "../controllers/GetUploadResultsController";
import { ListUploadsController } from "../controllers/ListUploadsController";
import { GetUploadRowErrorsController } from "../controllers/GetUploadRowErrorsController";

// Las rutas del bounded context, cada una conectada a su controller a través de adaptRoute
export function registerDocumentProcessingRoutes(server: FastifyInstance, container: AwilixContainer): void {
  server.post("/api/v1/uploads", adaptRoute(container.resolve<CreateUploadController>("createUploadController")));
  server.get("/api/v1/uploads", adaptRoute(container.resolve<ListUploadsController>("listUploadsController")));
  server.get("/api/v1/uploads/:id", adaptRoute(container.resolve<GetUploadByIdController>("getUploadByIdController")));
  server.get(
    "/api/v1/uploads/:id/results",
    adaptRoute(container.resolve<GetUploadResultsController>("getUploadResultsController")),
  );
  server.get(
    "/api/v1/uploads/:id/errors",
    adaptRoute(container.resolve<GetUploadRowErrorsController>("getUploadRowErrorsController")),
  );
}
