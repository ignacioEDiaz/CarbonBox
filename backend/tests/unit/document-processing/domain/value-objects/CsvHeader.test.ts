import { CsvHeader } from "../../../../../src/document-processing/domain/value-objects/CsvHeader";
import { ValidationError } from "../../../../../src/shared/domain/errors";

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const BOM = "﻿";

describe("CsvHeader.fromContent", () => {
  it.each([
    ["encabezado y una fila", "category,amount,unit,date\nElectricity,150.5,kWh,2024-01-15"],
    ["salto de línea de Windows", "category,amount,unit,date\r\nElectricity,150.5,kWh,2024-01-15\r\n"],
    ["BOM al principio", `${BOM}category,amount,unit,date\nWater,1,m3,2024-01-15`],
    ["mayúsculas y espacios alrededor", "Category, Amount ,UNIT,date\nWater,1,m3,2024-01-15"],
    ["solo el encabezado, sin salto final", "category,amount,unit,date"],
  ])("acepta %s", (_label, content) => {
    const result = CsvHeader.fromContent(bytes(content));

    expect(result.isRight()).toBe(true);
  });

  it.each([
    ["columnas en otro orden", "amount,category,unit,date\n"],
    ["una columna de menos", "category,amount,unit\n"],
    ["una columna de más", "category,amount,unit,date,notes\n"],
    ["otros nombres", "fecha,monto\n"],
    ["una fila de datos como primera línea", "Electricity,150.5,kWh,2024-01-15\n"],
    ["una columna vacía", "category,,unit,date\n"],
  ])("rechaza %s", (_label, content) => {
    const result = CsvHeader.fromContent(bytes(content));

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ValidationError);
  });

  it("rechaza un archivo binario", () => {
    const binary = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);

    expect(CsvHeader.fromContent(binary).isLeft()).toBe(true);
  });

  it("no busca el salto de línea más allá de 1024 bytes", () => {
    // El encabezado correcto aparece recién después de 2000 bytes sin salto de línea
    const content = bytes(`${"x".repeat(2000)}\ncategory,amount,unit,date\n`);

    expect(CsvHeader.fromContent(content).isLeft()).toBe(true);
  });

  it("el error dice qué encabezado se esperaba y cuál llegó", () => {
    const result = CsvHeader.fromContent(bytes("fecha,monto\n2024-01-15,10"));

    expect(result.isLeft() && result.value.message).toBe(
      'El encabezado debe ser "category,amount,unit,date" y llegó "fecha,monto"',
    );
  });

  it("recorta lo recibido a 100 caracteres en el mensaje", () => {
    const result = CsvHeader.fromContent(bytes(`${"a".repeat(300)}\n`));

    expect(result.isLeft() && result.value.message).toBe(
      `El encabezado debe ser "category,amount,unit,date" y llegó "${"a".repeat(100)}..."`,
    );
  });
});
