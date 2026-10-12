import { loadConfig } from "../../../src/config";

const DATABASE_URL = "postgresql://u:p@h:5432/db";
const S3_BUCKET = "mi-bucket";
const SQS_QUEUE_URL = "http://localhost:4566/000000000000/uploads";
const JWT_SECRET = "un-secreto-de-prueba-de-al-menos-32-caracteres";

// Lo mínimo obligatorio: cada test agrega o pisa lo que prueba
const REQUIRED = { DATABASE_URL, S3_BUCKET, SQS_QUEUE_URL, JWT_SECRET };

describe("loadConfig", () => {
  it("lee el puerto y la URL de la base desde el entorno", () => {
    const config = loadConfig({ ...REQUIRED, PORT: "4000" });

    expect(config.port).toBe(4000);
    expect(config.database.url).toBe(DATABASE_URL);
  });

  it("usa el puerto 3000 si no se define PORT", () => {
    const config = loadConfig(REQUIRED);

    expect(config.port).toBe(3000);
  });

  it("falla nombrando database.url si falta DATABASE_URL", () => {
    expect(() => loadConfig({ S3_BUCKET, SQS_QUEUE_URL, PORT: "3000" })).toThrow(/database\.url/);
  });

  it("falla nombrando database.url si DATABASE_URL está vacía", () => {
    expect(() => loadConfig({ ...REQUIRED, DATABASE_URL: "" })).toThrow(/database\.url/);
  });

  it("falla nombrando port si PORT no es un número", () => {
    expect(() => loadConfig({ ...REQUIRED, PORT: "abc" })).toThrow(/port/);
  });

  it("no muestra la contraseña de la base en el mensaje de error", () => {
    const urlConPassword = "postgresql://postgres:secreta@localhost:5432/db";

    expect(() => loadConfig({ ...REQUIRED, PORT: "abc", DATABASE_URL: urlConPassword })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("secreta") }),
    );
  });
});

describe("loadConfig: S3, SQS y subida", () => {
  it("lee la configuración de AWS, el bucket, la cola y la subida desde el entorno", () => {
    const config = loadConfig({
      ...REQUIRED,
      AWS_REGION: "sa-east-1",
      AWS_ENDPOINT_URL: "http://localhost:4566",
      SQS_VISIBILITY_TIMEOUT_SECONDS: "30",
      UPLOAD_MAX_FILE_SIZE_MB: "5",
    });

    expect(config.aws).toEqual({ region: "sa-east-1", endpoint: "http://localhost:4566" });
    expect(config.storage.bucket).toBe(S3_BUCKET);
    expect(config.queue).toEqual({ url: SQS_QUEUE_URL, visibilityTimeoutSeconds: 30 });
    expect(config.upload.maxFileSizeMb).toBe(5);
  });

  it("usa región us-east-1, endpoint vacío (AWS real), ocultamiento de 60 s y 10 MB por defecto", () => {
    const config = loadConfig(REQUIRED);

    expect(config.aws).toEqual({ region: "us-east-1", endpoint: "" });
    expect(config.queue.visibilityTimeoutSeconds).toBe(60);
    expect(config.upload.maxFileSizeMb).toBe(10);
  });

  it("falla nombrando storage.bucket si falta S3_BUCKET", () => {
    expect(() => loadConfig({ DATABASE_URL, SQS_QUEUE_URL })).toThrow(/storage\.bucket/);
  });

  it("falla nombrando queue.url si falta SQS_QUEUE_URL", () => {
    expect(() => loadConfig({ DATABASE_URL, S3_BUCKET })).toThrow(/queue\.url/);
  });

  it.each(["-1", "43201", "abc", "1.5"])("rechaza un ocultamiento de %p segundos", (seconds) => {
    expect(() => loadConfig({ ...REQUIRED, SQS_VISIBILITY_TIMEOUT_SECONDS: seconds })).toThrow(
      /queue\.visibilityTimeoutSeconds/,
    );
  });

  it.each(["0", "-3", "abc"])("rechaza un tamaño máximo de %p MB", (megabytes) => {
    expect(() => loadConfig({ ...REQUIRED, UPLOAD_MAX_FILE_SIZE_MB: megabytes })).toThrow(/upload\.maxFileSizeMb/);
  });

  it("lee el secreto del JWT y usa una hora de vencimiento por defecto", () => {
    expect(loadConfig(REQUIRED).jwt).toEqual({ secret: JWT_SECRET, expiresInSeconds: 3600 });
    expect(loadConfig({ ...REQUIRED, JWT_EXPIRES_IN_SECONDS: "900" }).jwt.expiresInSeconds).toBe(900);
  });

  it.each([undefined, "corto"])("falla nombrando jwt.secret si JWT_SECRET es %p", (secret) => {
    expect(() => loadConfig({ ...REQUIRED, JWT_SECRET: secret })).toThrow(/jwt\.secret/);
  });
});
