import { asValue } from "awilix";
import { ActivityData } from "../../src/document-processing/domain/entities/ActivityData";
import { App } from "../../src/main/App";
import { buildContainer } from "../../src/main/container";
import { InMemoryActivityDataRepository } from "../support/InMemoryActivityDataRepository";
import { InMemoryRowErrorRepository } from "../support/InMemoryRowErrorRepository";
import { InMemoryUploadRepository } from "../support/InMemoryUploadRepository";
import { testConfig } from "../support/testConfig";
import { pendingUpload } from "../support/uploadFixtures";

// App real con los repositorios reemplazados por dobles: no hace falta Docker
async function buildApp(uploadCount: number) {
  const uploadRepository = new InMemoryUploadRepository();
  const activityDataRepository = new InMemoryActivityDataRepository();
  const ids: string[] = [];
  for (let index = 0; index < uploadCount; index++) {
    const upload = pendingUpload(`memory/${index}.csv`);
    await uploadRepository.save(upload);
    ids.push(upload.id);
  }
  const container = buildContainer(testConfig());
  container.register({
    uploadRepository: asValue(uploadRepository),
    activityDataRepository: asValue(activityDataRepository),
    rowErrorRepository: asValue(new InMemoryRowErrorRepository()),
  });
  return { app: new App(container, { logger: false }), activityDataRepository, ids };
}

describe("GET /api/v1/uploads", () => {
  it("responde { data, total, page, limit } con la página pedida", async () => {
    const { app } = await buildApp(3);

    const response = await app.server.inject({ method: "GET", url: "/api/v1/uploads?page=1&limit=2" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect([body.data.length, body.total, body.page, body.limit]).toEqual([2, 3, 1, 2]);
    await app.server.close();
  });

  it("responde 400 VALIDATION_ERROR con un limit fuera de rango", async () => {
    const { app } = await buildApp(0);

    const response = await app.server.inject({ method: "GET", url: "/api/v1/uploads?limit=500" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: { type: "VALIDATION_ERROR", message: "limit debe ser un entero entre 1 y 100" } });
    await app.server.close();
  });
});

describe("GET /api/v1/uploads/:id/results", () => {
  it("responde 200 con las filas del upload", async () => {
    const { app, activityDataRepository, ids } = await buildApp(1);
    const row = ActivityData.create({ uploadId: ids[0], category: "Gas", amount: 30, unit: "m3", date: "2024-03-03" });
    if (row.isLeft()) throw row.value;
    await activityDataRepository.saveForUpload(ids[0], [row.value]);

    const response = await app.server.inject({ method: "GET", url: `/api/v1/uploads/${ids[0]}/results` });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [{ category: "Gas", amount: 30, unit: "m3", date: "2024-03-03" }] });
    await app.server.close();
  });

  it("responde 404 si el upload no existe", async () => {
    const { app } = await buildApp(0);

    const response = await app.server.inject({ method: "GET", url: "/api/v1/uploads/no-existe/results" });

    expect(response.statusCode).toBe(404);
    await app.server.close();
  });
});

describe("GET /api/v1/uploads/:id/errors", () => {
  it("responde 200 con data vacío si el upload no tiene errores", async () => {
    const { app, ids } = await buildApp(1);

    const response = await app.server.inject({ method: "GET", url: `/api/v1/uploads/${ids[0]}/errors` });

    expect([response.statusCode, response.json()]).toEqual([200, { data: [] }]);
    await app.server.close();
  });
});
