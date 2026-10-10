import { asValue } from "awilix";
import { App } from "../../src/main/App";
import { buildContainer } from "../../src/main/container";

// App real con el checker de la base reemplazado por un doble: no hace falta Postgres
function buildApp(isDatabaseUp: boolean): App {
  const container = buildContainer({ port: 0, database: { url: "postgresql://u:p@localhost:1/db" } });
  container.register({ databaseHealthChecker: asValue({ isUp: async () => isDatabaseUp }) });
  return new App(container, { logger: false });
}

describe("GET /health", () => {
  it("responde 200 con servicio y base disponibles", async () => {
    const app = buildApp(true);

    const response = await app.server.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ service: "up", database: "up" });
    await app.server.close();
  });

  it("responde 503 cuando la base no está disponible", async () => {
    const app = buildApp(false);

    const response = await app.server.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ service: "up", database: "down" });
    await app.server.close();
  });
});
