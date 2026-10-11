import { CsvParserService } from "../../../../../src/document-processing/application/services/CsvParserService";
import { CsvParseResult } from "../../../../../src/document-processing/application/services/ICsvParserService";
import { ActivityData } from "../../../../../src/document-processing/domain/entities/ActivityData";

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
