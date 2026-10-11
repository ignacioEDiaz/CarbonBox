import { FileName } from "../../../../../src/document-processing/domain/value-objects/FileName";
import { ValidationError } from "../../../../../src/shared/domain/errors";

describe("FileName", () => {
  it.each(["datos.csv", "DATOS.CSV", "reporte.2024.csv"])("acepta %p", (raw) => {
    const result = FileName.create(raw);

    expect(result.isRight()).toBe(true);
    expect(result.value).toBeInstanceOf(FileName);
  });

  it("recorta los espacios alrededor", () => {
    const result = FileName.create("  datos.csv  ");

    expect(result.isRight() && result.value.value).toBe("datos.csv");
  });

  it.each(["", "   ", "datos.txt", "datos", ".csv", "datos.csv.txt"])("rechaza %p", (raw) => {
    const result = FileName.create(raw);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ValidationError);
  });
});
