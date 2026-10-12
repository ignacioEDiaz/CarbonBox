import { AwilixContainer } from "awilix";
import { FastifyInstance } from "fastify";
import { ITokenService } from "../../../shared/application/security/ITokenService";
import { adaptAuthenticatedRoute } from "../../../shared/infrastructure/http/adaptRoute";
import { BaseController } from "../../../shared/infrastructure/http/BaseController";

// Todas las rutas de uploads piden sesión: cada una recibe el usuario del token
export function registerDocumentProcessingRoutes(server: FastifyInstance, container: AwilixContainer): void {
  const tokenService = container.resolve<ITokenService>("tokenService");
  const authenticated = (name: string) => adaptAuthenticatedRoute(container.resolve<BaseController>(name), tokenService);

  server.post("/api/v1/uploads", authenticated("createUploadController"));
  server.get("/api/v1/uploads", authenticated("listUploadsController"));
  // Rutas fijas: Fastify las prefiere a /:id, así "summary" no se toma como un id
  server.get("/api/v1/uploads/summary", authenticated("getUploadsSummaryController"));
  server.get("/api/v1/uploads/activity-by-month", authenticated("getActivityByMonthController"));
  server.get("/api/v1/uploads/:id", authenticated("getUploadByIdController"));
  server.get("/api/v1/uploads/:id/results", authenticated("getUploadResultsController"));
  server.get("/api/v1/uploads/:id/errors", authenticated("getUploadRowErrorsController"));
}

