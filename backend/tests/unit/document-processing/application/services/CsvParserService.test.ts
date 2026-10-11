import { CsvParserService } from "../../../../../src/document-processing/application/services/CsvParserService";
import { CsvParseResult } from "../../../../../src/document-processing/application/services/ICsvParserService";
import { ActivityData } from "../../../../../src/document-processing/domain/entities/ActivityData";
import { ValidationError } from "../../../../../src/shared/domain/errors";

const UPLOAD_ID = "8b0e5c0e-3a52-4c0e-9d53-0d2a0f1c7a11";
const HEADER = "category,amount,unit,date";
const AMOUNT_FORMAT = "no es un número válido: usá solo dígitos y punto decimal (por ejemplo, 12.5)";

const parser = new CsvParserService();

// Arma el contenido de un CSV: una línea por argumento, con el salto final que deja cualquier editor
function csv(...lines: string[]): Buffer {
  return Buffer.from(`${lines.join("\n")}\n`);
}

// Para los casos donde el archivo es procesable: si llega un Left, el test falla con su motivo
function parseOk(content: Uint8Array): CsvParseResult {
  const result = parser.parse(content, UPLOAD_ID);
  if (result.isLeft()) {
    throw new Error(`Se esperaba un resultado y llegó un error de archivo: ${result.value.message}`);
  }
  return result.value;
}

function values(rows: ActivityData[]): (string | number)[][] {
  return rows.map((row) => [row.category, row.amount, row.unit, row.date]);
}

describe("CsvParserService: filas válidas e inválidas (US1)", () => {
  it("devuelve las filas válidas con sus valores, asociadas al upload", () => {
    const result = parseOk(
      csv(HEADER, "Electricidad,1200,kWh,2024-03-01", "Gas,12.5,m3,2024-03-02", "Agua,0.75,m3,2024-02-29"),
    );

    expect(values(result.validRows)).toEqual([
      ["Electricidad", 1200, "kWh", "2024-03-01"],
      ["Gas", 12.5, "m3", "2024-03-02"],
      ["Agua", 0.75, "m3", "2024-02-29"],
    ]);
    expect(result.validRows.every((row) => row.uploadId === UPLOAD_ID)).toBe(true);
    expect(result.rowErrors).toEqual([]);
    expect(result.totalRows).toBe(3);
  });

  it("informa la fila con la categoría vacía en su línea, y las demás siguen", () => {
    const result = parseOk(csv(HEADER, "Electricidad,10,kWh,2024-03-01", ",20,kWh,2024-03-02", "Gas,30,m3,2024-03-03"));

    expect(result.rowErrors).toEqual([{ line: 3, message: "La categoría no puede estar vacía" }]);
    expect(values(result.validRows).map(([category]) => category)).toEqual(["Electricidad", "Gas"]);
  });

  it("informa la unidad vacía", () => {
    const result = parseOk(csv(HEADER, "Gas,10,,2024-03-01"));

    expect(result.rowErrors).toEqual([{ line: 2, message: "La unidad no puede estar vacía" }]);
  });

  it("informa la cantidad 0 con la regla de ActivityData", () => {
    const result = parseOk(csv(HEADER, "Gas,0,m3,2024-03-01"));

    expect(result.rowErrors).toEqual([{ line: 2, message: "La cantidad debe ser un número mayor que cero" }]);
  });

  it.each([
    { label: "negativa", written: "-5", received: "-5" },
    { label: "texto", written: "abc", received: "abc" },
    { label: "con coma decimal", written: '"12,5"', received: "12,5" },
    { label: "en notación científica", written: "1e3", received: "1e3" },
    { label: "hexadecimal", written: "0x10", received: "0x10" },
    { label: "con signo +", written: "+5", received: "+5" },
    { label: "sin dígito antes del punto", written: ".5", received: ".5" },
    { label: "sin dígito después del punto", written: "5.", received: "5." },
    { label: "con unidad pegada", written: "12kg", received: "12kg" },
    { label: "vacía", written: "", received: "" },
  ])("rechaza la cantidad $label mostrando el valor recibido", ({ written, received }) => {
    const result = parseOk(csv(HEADER, `Gas,${written},m3,2024-03-01`));

    expect(result.rowErrors).toEqual([{ line: 2, message: `La cantidad "${received}" ${AMOUNT_FORMAT}` }]);
  });

  it("acepta ceros a la izquierda en la cantidad", () => {
    const result = parseOk(csv(HEADER, "Gas,0007,m3,2024-03-01"));

    expect(values(result.validRows)).toEqual([["Gas", 7, "m3", "2024-03-01"]]);
  });

  it.each(["2024-02-31", "2024-13-01", "31/01/2024", "2024-1-5", ""])(
    "rechaza la fecha %p mostrando el valor recibido",
    (date) => {
      const result = parseOk(csv(HEADER, `Gas,10,m3,${date}`));

      expect(result.rowErrors).toEqual([{ line: 2, message: `La fecha "${date}" no es válida (formato YYYY-MM-DD)` }]);
    },
  );

  it.each([
    { label: "3 columnas", line: "Gas,10,m3", count: 3 },
    { label: "5 columnas", line: "Gas,10,m3,2024-03-01,extra", count: 5 },
  ])("informa una fila con $label", ({ line, count }) => {
    const result = parseOk(csv(HEADER, line));

    expect(result.rowErrors).toEqual([{ line: 2, message: `La fila tiene ${count} columnas y se esperaban 4` }]);
  });

  it("informa un solo motivo aunque la fila tenga varios problemas", () => {
    const result = parseOk(csv(HEADER, ",10,m3,2024-02-31"));

    expect(result.rowErrors).toEqual([{ line: 2, message: "La categoría no puede estar vacía" }]);
  });

  it("descarta los espacios alrededor de cada valor", () => {
    const result = parseOk(csv(HEADER, " Electricidad , 12.5 , kWh , 2024-03-01 "));

    expect(values(result.validRows)).toEqual([["Electricidad", 12.5, "kWh", "2024-03-01"]]);
  });

  it("cuenta cada fila una sola vez: válidas + errores = total", () => {
    const result = parseOk(
      csv(HEADER, "Electricidad,10,kWh,2024-03-01", "Gas,abc,m3,2024-03-02", "Agua,5,m3,2024-03-03", ",1,kWh,2024-03-04"),
    );

    expect(result.validRows).toHaveLength(2);
    expect(result.rowErrors.map((error) => error.line)).toEqual([3, 5]);
    expect(result.totalRows).toBe(4);
  });

  it("da el mismo resultado si se procesa dos veces el mismo contenido", () => {
    const content = csv(HEADER, "Electricidad,10,kWh,2024-03-01", "Gas,abc,m3,2024-03-02");

    const first = parseOk(content);
    const second = parseOk(content);

    expect(values(second.validRows)).toEqual(values(first.validRows));
    expect(second.rowErrors).toEqual(first.rowErrors);
    expect(second.totalRows).toBe(first.totalRows);
  });
});

// Para los casos donde el archivo entero no se puede procesar: devuelve el mensaje del Left
function parseError(content: Uint8Array): string {
  const result = parser.parse(content, UPLOAD_ID);
  if (result.isRight()) {
    throw new Error(`Se esperaba un error de archivo y llegaron ${result.value.totalRows} filas`);
  }
  expect(result.value).toBeInstanceOf(ValidationError);
  return result.value.message;
}

describe("CsvParserService: archivos que no se pueden procesar (US2)", () => {
  it.each([
    { label: "en otro orden", header: "amount,category,unit,date" },
    { label: "con una columna de más", header: "category,amount,unit,date,extra" },
    { label: "con una columna de menos", header: "category,amount,unit" },
    { label: "separado por punto y coma", header: "category;amount;unit;date" },
    { label: "que es una fila de datos", header: "Electricidad,10,kWh,2024-03-01" },
  ])("rechaza un encabezado $label con el mensaje de la subida", ({ header }) => {
    const message = parseError(csv(header, "Gas,10,m3,2024-03-01"));

    expect(message).toBe(`El encabezado debe ser "category,amount,unit,date" y llegó "${header}"`);
  });

  it.each([
    { label: "con mayúsculas y espacios", content: csv("Category, Amount ,UNIT,date", "Gas,10,m3,2024-03-01") },
    { label: "con saltos de línea de Windows", content: Buffer.from(`${HEADER}\r\nGas,10,m3,2024-03-01\r\n`) },
    { label: "precedido por la marca BOM", content: Buffer.from(`﻿${HEADER}\nGas,10,m3,2024-03-01\n`) },
  ])("acepta el encabezado $label, como la subida", ({ content }) => {
    expect(values(parseOk(content).validRows)).toEqual([["Gas", 10, "m3", "2024-03-01"]]);
  });

  it.each([
    { label: "solo el encabezado", content: csv(HEADER) },
    { label: "el encabezado y líneas vacías", content: csv(HEADER, "", "   ", "") },
  ])("rechaza un archivo con $label porque no tiene filas de datos", ({ content }) => {
    expect(parseError(content)).toBe("El archivo no tiene filas de datos: solo trae el encabezado");
  });

  it("rechaza un archivo que no es texto UTF-8", () => {
    // "é" en Latin-1 es el byte 0xe9, que en UTF-8 no es válido solo
    const latin1Row = Buffer.from([0x43, 0x61, 0x66, 0xe9, 0x2c, 0x31, 0x2c, 0x6b, 0x67, 0x2c]);
    const content = Buffer.concat([Buffer.from(`${HEADER}\n`), latin1Row, Buffer.from("2024-03-01\n")]);

    expect(parseError(content)).toBe("El archivo no es texto UTF-8 válido: guardalo como CSV UTF-8");
  });

  it("rechaza comillas sin cerrar e indica la última línea leída bien", () => {
    const content = csv(HEADER, "Gas,10,m3,2024-03-01", "", '"Electricidad,10,kWh,2024-03-01', "Agua,5,m3,2024-03-02");

    expect(parseError(content)).toBe("El archivo tiene comillas mal cerradas después de la línea 2");
  });

  it("rechaza comillas sin cerrar en la primera fila de datos (después del encabezado)", () => {
    expect(parseError(csv(HEADER, '"Gas,10,m3,2024-03-01'))).toBe(
      "El archivo tiene comillas mal cerradas después de la línea 1",
    );
  });

  it("rechaza texto después de la comilla de cierre", () => {
    expect(parseError(csv(HEADER, '"Gas"x,10,m3,2024-03-01'))).toBe(
      "El archivo tiene comillas mal cerradas después de la línea 1",
    );
  });
});

describe("CsvParserService: el CSV según el estándar (US3)", () => {
  it("lee una coma dentro de un valor entre comillas como parte del valor", () => {
    const result = parseOk(csv(HEADER, '"Oficina, piso 2",10,kWh,2024-03-01'));

    expect(values(result.validRows)).toEqual([["Oficina, piso 2", 10, "kWh", "2024-03-01"]]);
  });

  it("lee las comillas escritas dobles dentro de un valor entre comillas", () => {
    const result = parseOk(csv(HEADER, '"Sala ""A""",10,kWh,2024-03-01'));

    expect(values(result.validRows)).toEqual([['Sala "A"', 10, "kWh", "2024-03-01"]]);
  });

  it("toma como texto una comilla suelta dentro de un valor sin comillas", () => {
    const result = parseOk(csv(HEADER, 'Sala "A,10,kWh,2024-03-01'));

    expect(values(result.validRows)).toEqual([['Sala "A', 10, "kWh", "2024-03-01"]]);
  });

  it("da el mismo resultado con saltos de línea de Unix y de Windows, con las líneas reales", () => {
    const lines = [HEADER, "Electricidad,10,kWh,2024-03-01", "", "   ", ",5,kWh,2024-03-02", "Gas,abc,m3,2024-03-03", ""];

    const unix = parseOk(Buffer.from(lines.join("\n")));
    const windows = parseOk(Buffer.from(lines.join("\r\n")));

    expect(unix.rowErrors.map((error) => error.line)).toEqual([5, 6]);
    expect(windows.rowErrors).toEqual(unix.rowErrors);
    expect(values(windows.validRows)).toEqual(values(unix.validRows));
    expect(windows.totalRows).toBe(unix.totalRows);
  });

  it.each([
    { label: "Unix", eol: "\n" },
    { label: "Windows", eol: "\r\n" },
  ])("informa una fila de varias líneas ($label) en la línea donde empieza, sin correr las siguientes", ({ eol }) => {
    const lines = [HEADER, "Gas,10,m3,2024-03-01", '"Oficina', "piso", '2",-1,kWh,2024-03-02', ",5,kWh,2024-03-03", ""];

    const result = parseOk(Buffer.from(lines.join(eol)));

    expect(result.rowErrors.map((error) => error.line)).toEqual([3, 6]);
  });

  it("ignora las líneas vacías y de solo espacios: no cuentan como filas", () => {
    const result = parseOk(csv(HEADER, "", "Gas,10,m3,2024-03-01", "   ", "", ",5,kWh,2024-03-02", ""));

    expect(result.totalRows).toBe(2);
    expect(result.rowErrors).toEqual([{ line: 6, message: "La categoría no puede estar vacía" }]);
  });
});

describe("CsvParserService: tamaño máximo de subida", () => {
  // Arma un CSV válido de al menos 10 MB (el máximo de la subida) y devuelve cuántas filas tiene
  function tenMegabyteCsv(): { content: Buffer; rows: number } {
    const lines = [HEADER];
    let size = 0;
    while (size < 10 * 1024 * 1024) {
      const row = `Electricidad oficina ${lines.length % 50},${(lines.length % 900) + 1}.5,kWh,2024-0${(lines.length % 9) + 1}-15`;
      lines.push(row);
      size += row.length + 1;
    }
    // join y no csv(...lines): pasar cientos de miles de argumentos desborda la pila
    return { content: Buffer.from(`${lines.join("\n")}\n`), rows: lines.length - 1 };
  }

  it("procesa un archivo de 10 MB completo en menos de 10 segundos (SC-003)", () => {
    const { content, rows } = tenMegabyteCsv();

    const start = Date.now();
    const result = parseOk(content);
    const elapsedMs = Date.now() - start;

    expect(result.totalRows).toBe(rows);
    expect(result.rowErrors).toEqual([]);
    expect(elapsedMs).toBeLessThan(10_000);
  }, 30_000);
});
