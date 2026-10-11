import { IdempotencyKey } from "../../../../../src/document-processing/domain/value-objects/IdempotencyKey";
import { ValidationError } from "../../../../../src/shared/domain/errors";

describe("IdempotencyKey", () => {
  it.each(["abc-123", "k".repeat(255), "8b0e5c0e-3a52-4c0e-9d53-0d2a0f1c7a11"])("acepta %p tal cual", (raw) => {
    const result = IdempotencyKey.create(raw);

    expect(result.isRight() && result.value.value).toBe(raw);
  });

  it.each([
    { label: "vacía", raw: "" },
    { label: "con solo espacios", raw: "   " },
    { label: "de 256 caracteres", raw: "k".repeat(256) },
  ])("rechaza una clave $label", ({ raw }) => {
    const result = IdempotencyKey.create(raw);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ValidationError);
  });
});
