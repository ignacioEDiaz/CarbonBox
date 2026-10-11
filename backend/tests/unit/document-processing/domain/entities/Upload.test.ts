import { Upload } from "../../../../../src/document-processing/domain/entities/Upload";
import { FileName } from "../../../../../src/document-processing/domain/value-objects/FileName";
import { UploadStatus } from "../../../../../src/document-processing/domain/value-objects/UploadStatus";
import { ValidationError } from "../../../../../src/shared/domain/errors";

const T0 = new Date("2026-01-01T10:00:00.000Z");
const T1 = new Date("2026-01-01T10:05:00.000Z");

function validFileName(): FileName {
  const result = FileName.create("datos.csv");
  if (result.isLeft()) throw result.value;
  return result.value;
}

function newUpload(): Upload {
  const result = Upload.create({ fileName: validFileName(), fileUrl: "uploads/datos.csv", userId: "user-123" });
  if (result.isLeft()) throw result.value;
  return result.value;
}

function uploadIn(status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"): Upload {
  const upload = newUpload();
  if (status === "PENDING") return upload;
  upload.markAsProcessing();
  if (status === "COMPLETED") upload.markAsCompleted({ totalRows: 1, processedRows: 1, failedRows: 0 });
  if (status === "FAILED") upload.markAsFailed("error");
  return upload;
}

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Upload.create", () => {
  it("crea un upload PENDING, del usuario, sin conteos ni error", () => {
    const upload = newUpload();

    expect(upload.id).not.toBe("");
    expect(upload.status.equals(UploadStatus.PENDING)).toBe(true);
    expect(upload.fileName.value).toBe("datos.csv");
    expect(upload.fileUrl).toBe("uploads/datos.csv");
    expect(upload.userId).toBe("user-123");
    expect(upload.totalRows).toBeNull();
    expect(upload.processedRows).toBeNull();
    expect(upload.failedRows).toBeNull();
    expect(upload.errorMessage).toBeNull();
    expect(upload.createdAt).toEqual(T0);
    expect(upload.updatedAt).toEqual(T0);
  });

  it("genera ids distintos para cada upload", () => {
    expect(newUpload().id).not.toBe(newUpload().id);
  });

  it("rechaza una ubicación de archivo vacía", () => {
    const result = Upload.create({ fileName: validFileName(), fileUrl: "  ", userId: "user-123" });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ValidationError);
  });
});

describe("Upload.create: clave de idempotencia (opcional)", () => {
  const create = (idempotencyKey?: string | null) =>
    Upload.create({ fileName: validFileName(), fileUrl: "uploads/datos.csv", userId: "user-123", idempotencyKey });

  it("sin clave, queda en null", () => {
    expect(newUpload().idempotencyKey).toBeNull();
  });

  it("guarda la clave que manda el cliente", () => {
    const result = create("abc-123");

    expect(result.isRight() && result.value.idempotencyKey).toBe("abc-123");
  });

  it("acepta una clave de 255 caracteres", () => {
    expect(create("k".repeat(255)).isRight()).toBe(true);
  });

  it.each([
    { label: "vacía", key: "" },
    { label: "con solo espacios", key: "   " },
    { label: "de 256 caracteres", key: "k".repeat(256) },
  ])("rechaza una clave $label", ({ key }) => {
    const result = create(key);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ValidationError);
  });
});

describe("transiciones válidas", () => {
  it("PENDING -> PROCESSING y actualiza updatedAt", () => {
    const upload = newUpload();
    jest.setSystemTime(T1);

    expect(upload.markAsProcessing().isRight()).toBe(true);
    expect(upload.status.equals(UploadStatus.PROCESSING)).toBe(true);
    expect(upload.updatedAt).toEqual(T1);
    expect(upload.createdAt).toEqual(T0);
  });

  it("PROCESSING -> PROCESSING se acepta como reintento", () => {
    const upload = uploadIn("PROCESSING");

    expect(upload.markAsProcessing().isRight()).toBe(true);
    expect(upload.status.equals(UploadStatus.PROCESSING)).toBe(true);
  });

  it("PROCESSING -> COMPLETED guarda los conteos", () => {
    const upload = uploadIn("PROCESSING");

    const result = upload.markAsCompleted({ totalRows: 10, processedRows: 8, failedRows: 2 });

    expect(result.isRight()).toBe(true);
    expect(upload.status.equals(UploadStatus.COMPLETED)).toBe(true);
    expect([upload.totalRows, upload.processedRows, upload.failedRows]).toEqual([10, 8, 2]);
  });

  it("PENDING -> FAILED guarda el mensaje de error (no se pudo encolar)", () => {
    const upload = uploadIn("PENDING");

    expect(upload.markAsFailed("No se pudo encolar el archivo para procesarlo").isRight()).toBe(true);
    expect(upload.status.equals(UploadStatus.FAILED)).toBe(true);
    expect(upload.errorMessage).toBe("No se pudo encolar el archivo para procesarlo");
  });

  it("PROCESSING -> FAILED guarda el mensaje de error", () => {
    const upload = uploadIn("PROCESSING");

    expect(upload.markAsFailed("archivo ilegible").isRight()).toBe(true);
    expect(upload.status.equals(UploadStatus.FAILED)).toBe(true);
    expect(upload.errorMessage).toBe("archivo ilegible");
  });
});

function attemptTransition(upload: Upload, to: "PROCESSING" | "COMPLETED" | "FAILED") {
  switch (to) {
    case "PROCESSING":
      return upload.markAsProcessing();
    case "COMPLETED":
      return upload.markAsCompleted({ totalRows: 1, processedRows: 1, failedRows: 0 });
    case "FAILED":
      return upload.markAsFailed("error");
  }
}

describe("transiciones inválidas: se rechazan y el upload no cambia", () => {
  it.each([
    ["PENDING", "COMPLETED"],
    ["COMPLETED", "PROCESSING"],
    ["COMPLETED", "COMPLETED"],
    ["COMPLETED", "FAILED"],
    ["FAILED", "PROCESSING"],
    ["FAILED", "COMPLETED"],
    ["FAILED", "FAILED"],
  ] as const)("%s -> %s", (from, to) => {
    const upload = uploadIn(from);
    const before = { status: upload.status.value, updatedAt: upload.updatedAt };
    jest.setSystemTime(T1);

    const result = attemptTransition(upload, to);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ValidationError);
    expect(upload.status.value).toBe(before.status);
    expect(upload.updatedAt).toEqual(before.updatedAt);
  });
});

describe("datos inválidos en una transición permitida", () => {
  it("FAILED exige un mensaje no vacío", () => {
    const upload = uploadIn("PROCESSING");

    expect(upload.markAsFailed("   ").isLeft()).toBe(true);
    expect(upload.status.equals(UploadStatus.PROCESSING)).toBe(true);
  });

  it.each([
    { label: "no cierran (8 + 1 ≠ 10)", counts: { totalRows: 10, processedRows: 8, failedRows: 1 } },
    { label: "negativos", counts: { totalRows: -1, processedRows: 0, failedRows: -1 } },
    { label: "no enteros", counts: { totalRows: 2.5, processedRows: 1.5, failedRows: 1 } },
  ])("COMPLETED rechaza conteos que $label", ({ counts }) => {
    const upload = uploadIn("PROCESSING");

    expect(upload.markAsCompleted(counts).isLeft()).toBe(true);
    expect(upload.status.equals(UploadStatus.PROCESSING)).toBe(true);
    expect(upload.totalRows).toBeNull();
  });
});
