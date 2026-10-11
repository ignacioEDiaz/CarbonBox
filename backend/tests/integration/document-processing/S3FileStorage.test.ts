import { S3FileStorage } from "../../../src/document-processing/infrastructure/storage/S3FileStorage";
import { testConfig } from "../../support/testConfig";
import { createTestAwsClients, testBucket } from "../testAws";

const { s3Client } = createTestAwsClients();
const storage = new S3FileStorage(s3Client, testConfig({ storage: { bucket: testBucket() } }));

afterAll(() => {
  s3Client.destroy();
});

describe("S3FileStorage (LocalStack)", () => {
  it("devuelve una ubicación generada, que no depende del nombre del archivo", async () => {
    const location = await storage.save(Buffer.from("category,amount,unit,date\n"));

    expect(location).toMatch(/^uploads\/[0-9a-f-]{36}\.csv$/);
  });

  it("devuelve exactamente los mismos bytes, con BOM, \\r\\n y caracteres no ASCII", async () => {
    const content = Buffer.from("﻿category,amount,unit,date\r\nñandú,1,kg,2024-01-16\r\n", "utf8");

    const read = await storage.read(await storage.save(content));

    expect(read.equals(content)).toBe(true);
  });

  it("dos archivos iguales quedan en ubicaciones distintas: ninguno pisa al otro", async () => {
    const content = Buffer.from("category,amount,unit,date\n");

    const first = await storage.save(content);
    const second = await storage.save(content);

    expect(first).not.toBe(second);
  });

  it("rechaza leer una ubicación que no existe", async () => {
    await expect(storage.read("uploads/no-existe.csv")).rejects.toThrow();
  });
});
