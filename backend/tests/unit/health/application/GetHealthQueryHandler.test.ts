import { GetHealthQuery } from "../../../../src/health/application/GetHealthQuery";
import { GetHealthQueryHandler } from "../../../../src/health/application/GetHealthQueryHandler";
import { IDatabaseHealthChecker } from "../../../../src/health/application/IDatabaseHealthChecker";

function checkerThatReturns(isUp: boolean): IDatabaseHealthChecker {
  return { isUp: async () => isUp };
}

describe("GetHealthQueryHandler", () => {
  it("informa la base disponible cuando responde", async () => {
    const handler = new GetHealthQueryHandler(checkerThatReturns(true));

    const result = await handler.execute(new GetHealthQuery());

    expect(result.isRight()).toBe(true);
    expect(result.value).toEqual({ service: "up", database: "up" });
  });

  it("informa la base no disponible cuando no responde", async () => {
    const handler = new GetHealthQueryHandler(checkerThatReturns(false));

    const result = await handler.execute(new GetHealthQuery());

    expect(result.isRight()).toBe(true);
    expect(result.value).toEqual({ service: "up", database: "down" });
  });
});
