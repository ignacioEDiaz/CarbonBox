import { asValue } from "awilix";
import { App } from "../../src/main/App";
import { buildContainer } from "../../src/main/container";
import { InMemoryFileStorage } from "../support/InMemoryFileStorage";
import { InMemoryMessageQueue } from "../support/InMemoryMessageQueue";
import { InMemoryUploadRepository } from "../support/InMemoryUploadRepository";
import { testConfig, TestConfigOverrides } from "../support/testConfig";

const VALID_CSV = "category,amount,unit,date\nElectricity,150.5,kWh,2024-01-15\n";

type FilePart = { fileName: string; content: string };

// App real con S3, SQS y la base reemplazados por dobles: no hace falta Docker
function buildApp(overrides: TestConfigOverrides = {}) {
  const storage = new InMemoryFileStorage();
  const queue = new InMemoryMessageQueue();
  const repository = new InMemoryUploadRepository();
  const container = buildContainer(testConfig(overrides));
  container.register({
    fileStorage: asValue(storage),
    messagePublisher: asValue(queue),
    uploadRepository: asValue(repository),
  });
  return { app: new App(container, { logger: false }), storage, queue, repository };
}

// Arma un cuerpo multipart/form-data con las APIs de Node, sin librerías: Response calcula el
// cuerpo y el content-type con su boundary
async function multipart(...files: FilePart[]) {
  const form = new FormData();
  for (const file of files) {
    form.append("file", new Blob([file.content]), file.fileName);
  }
  const response = new Response(form);
  return {
    payload: Buffer.from(await response.arrayBuffer()),
    headers: { "content-type": response.headers.get("content-type") ?? "" },
  };
}

async function upload(app: App, ...files: FilePart[]) {
  return app.server.inject({ method: "POST", url: "/api/v1/uploads", ...(await multipart(...files)) });
}

describe("POST /api/v1/uploads", () => {
  it("responde 202 con el comprobante y deja archivo, upload y mensaje", async () => {
    const { app, storage, queue, repository } = buildApp();

    const response = await upload(app, { fileName: "datos.csv", content: VALID_CSV });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body).toEqual({ id: expect.any(String), status: "PENDING", fileName: "datos.csv", createdAt: expect.any(String) });
    expect(storage.files.size).toBe(1);
    expect(repository.all.map((saved) => saved.id)).toEqual([body.id]);
    expect(queue.messages).toEqual([{ uploadId: body.id }]);
    await app.server.close();
  });

  it("una petición que no es multipart responde 400 porque falta el archivo", async () => {
    const { app, repository } = buildApp();

    const response = await app.server.inject({ method: "POST", url: "/api/v1/uploads", payload: {} });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { type: "VALIDATION_ERROR", message: 'Falta el archivo: enviá un CSV en el campo "file"' },
    });
    expect(repository.all).toEqual([]);
    await app.server.close();
  });

  it.each([
    { label: "extensión .txt", file: { fileName: "datos.txt", content: VALID_CSV } },
    { label: "archivo vacío", file: { fileName: "datos.csv", content: "" } },
    { label: "encabezado incorrecto", file: { fileName: "datos.csv", content: "fecha,monto\n2024-01-15,10\n" } },
  ])("$label: responde 400 y no guarda nada", async ({ file }) => {
    const { app, storage, queue, repository } = buildApp();

    const response = await upload(app, file);

    expect(response.statusCode).toBe(400);
    expect(response.json().error.type).toBe("VALIDATION_ERROR");
    expect([storage.files.size, queue.messages.length, repository.all.length]).toEqual([0, 0, 0]);
    await app.server.close();
  });

  it("un archivo más grande que el máximo responde 413", async () => {
    const { app, repository } = buildApp({ upload: { maxFileSizeMb: 1 } });
    const twoMegabytes = VALID_CSV + "a".repeat(2 * 1024 * 1024);

    const response = await upload(app, { fileName: "grande.csv", content: twoMegabytes });

    expect(response.statusCode).toBe(413);
    expect(response.json().error.type).toBe("VALIDATION_ERROR");
    expect(repository.all).toEqual([]);
    await app.server.close();
  });

  it("si llegan dos archivos, usa el primero", async () => {
    const { app } = buildApp();

    const response = await upload(
      app,
      { fileName: "datos.csv", content: VALID_CSV },
      { fileName: "otro.csv", content: VALID_CSV },
    );

    expect(response.statusCode).toBe(202);
    expect(response.json().fileName).toBe("datos.csv");
    await app.server.close();
  });
});
