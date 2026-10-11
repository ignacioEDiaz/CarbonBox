import { ValueObject } from "../../../../src/shared/domain/ValueObject";

class Color extends ValueObject<string> {
  constructor(value: string) {
    super(value);
  }
}

describe("ValueObject", () => {
  it("guarda el valor recibido", () => {
    expect(new Color("rojo").value).toBe("rojo");
  });

  it("dos value objects con el mismo valor son iguales", () => {
    expect(new Color("rojo").equals(new Color("rojo"))).toBe(true);
  });

  it("dos value objects con distinto valor no son iguales", () => {
    expect(new Color("rojo").equals(new Color("azul"))).toBe(false);
  });
});
