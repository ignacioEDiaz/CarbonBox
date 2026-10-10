import { GetHealthQuery } from "../../../../src/health/application/GetHealthQuery";
import { HealthStatus } from "../../../../src/health/application/GetHealthQueryHandler";
import { HealthController } from "../../../../src/health/presentation/HealthController";
import { IQueryHandler } from "../../../../src/shared/application/IQueryHandler";
import { Either } from "../../../../src/shared/domain/Either";

function handlerThatReturns(status: HealthStatus): IQueryHandler<GetHealthQuery, HealthStatus> {
  return { execute: async () => Either.right(status) };
}

describe("HealthController", () => {
  it("responde 200 cuando la base está disponible", async () => {
    const status: HealthStatus = { service: "up", database: "up" };
    const controller = new HealthController(handlerThatReturns(status));

    await expect(controller.handle()).resolves.toEqual({ statusCode: 200, body: status });
  });

  it("responde 503 cuando la base no está disponible", async () => {
    const status: HealthStatus = { service: "up", database: "down" };
    const controller = new HealthController(handlerThatReturns(status));

    await expect(controller.handle()).resolves.toEqual({ statusCode: 503, body: status });
  });
});
