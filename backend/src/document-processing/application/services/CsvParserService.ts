import { CsvError, InfoRecord, parse } from "csv-parse/sync";
import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { ActivityData } from "../../domain/entities/ActivityData";
import { CsvHeader, EXPECTED_CSV_COLUMNS } from "../../domain/value-objects/CsvHeader";
import { RowError } from "../../domain/value-objects/RowError";
import { CsvParseResult, ICsvParserService } from "./ICsvParserService";

// Solo dígitos, con punto decimal opcional: Number() solo aceptaría "", "1e3" o "0x10"
const AMOUNT_FORMAT = /^\d+(\.\d+)?$/;

type CsvRow = { fields: string[]; line: number };

// Convierte el CSV crudo en filas de ActivityData. Las reglas de cada fila son las de la
// entidad: acá solo se lee el texto, se cuentan las columnas y se convierte la cantidad.
export class CsvParserService implements ICsvParserService {
  // Primero lo que invalida el archivo entero; después, fila por fila
  parse(content: Uint8Array, uploadId: string): Either<ValidationError, CsvParseResult> {
    const textOrError = decodeUtf8(content);
    if (textOrError.isLeft()) {
      return Either.left(textOrError.value);
    }
    const headerOrError = CsvHeader.fromContent(content);
    if (headerOrError.isLeft()) {
      return Either.left(headerOrError.value);
    }
    // Con \r\n dentro de un valor entre comillas, la biblioteca cuenta líneas de más
    const rowsOrError = readRows(textOrError.value.replace(/\r\n/g, "\n"));
    if (rowsOrError.isLeft()) {
      return Either.left(rowsOrError.value);
    }
    if (rowsOrError.value.length === 0) {
      return Either.left(new ValidationError("El archivo no tiene filas de datos: solo trae el encabezado"));
    }
    return Either.right(classifyRows(rowsOrError.value, uploadId));
  }
}

// Con fatal, un byte que no es UTF-8 lanza en vez de convertirse en "�". También descarta el BOM.
function decodeUtf8(content: Uint8Array): Either<ValidationError, string> {
  try {
    return Either.right(new TextDecoder("utf-8", { fatal: true }).decode(content));
  } catch (error) {
    if (!isInvalidUtf8Error(error)) {
      throw error;
    }
    return Either.left(new ValidationError("El archivo no es texto UTF-8 válido: guardalo como CSV UTF-8"));
  }
}

// Se reconoce por el código de Node y no con instanceof TypeError: en los tests, Jest corre el
// código en otro contexto y el TypeError de Node no es el mismo objeto que el del test
function isInvalidUtf8Error(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ERR_ENCODING_INVALID_ENCODED_DATA"
  );
}

function readRows(text: string): Either<ValidationError, CsvRow[]> {
  const rows: CsvRow[] = [];
  let lastReadLine = 1; // el encabezado
  try {
    parse(text, {
      from_line: 2, // la línea 1 es el encabezado, ya validado
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // otra cantidad de columnas es un error de esa fila, no del archivo
      relax_quotes: true, // una comilla suelta en un valor sin comillas (Sala "A) es texto
      on_record: (fields: string[], context: InfoRecord) => {
        rows.push({ fields, line: startLine(fields, context) });
        lastReadLine = context.lines;
        return fields;
      },
    });
  } catch (error) {
    if (!(error instanceof CsvError)) {
      throw error;
    }
    // Una comilla sin cerrar se come el resto del archivo: la biblioteca solo informa dónde
    // terminó. Lo que se sabe con certeza es que el problema está después de la última fila leída.
    return Either.left(
      new ValidationError(`El archivo tiene comillas mal cerradas después de la línea ${lastReadLine}`),
    );
  }
  return Either.right(rows);
}

// La biblioteca informa la línea donde termina la fila. Cada salto de línea dentro de un valor
// entre comillas es una línea más del archivo, así que restándolos se llega a donde empieza.
function startLine(fields: string[], context: InfoRecord): number {
  const extraLines = fields.join("").split("\n").length - 1;
  return context.lines - extraLines;
}

function classifyRows(rows: CsvRow[], uploadId: string): CsvParseResult {
  const validRows: ActivityData[] = [];
  const rowErrors: RowError[] = [];
  for (const row of rows) {
    const activityOrError = toActivityData(row.fields, uploadId);
    if (activityOrError.isLeft()) {
      rowErrors.push({ line: row.line, message: activityOrError.value.message });
    } else {
      validRows.push(activityOrError.value);
    }
  }
  return { validRows, rowErrors, totalRows: rows.length };
}

// Devuelve el primer problema que encuentra: alcanza para que la persona corrija la fila
function toActivityData(fields: string[], uploadId: string): Either<ValidationError, ActivityData> {
  if (fields.length !== EXPECTED_CSV_COLUMNS.length) {
    return Either.left(
      new ValidationError(`La fila tiene ${fields.length} columnas y se esperaban ${EXPECTED_CSV_COLUMNS.length}`),
    );
  }
  const [category, amountText, unit, date] = fields;
  const amountOrError = parseAmount(amountText);
  if (amountOrError.isLeft()) {
    return Either.left(amountOrError.value);
  }
  return ActivityData.create({ uploadId, category, amount: amountOrError.value, unit, date });
}

function parseAmount(text: string): Either<ValidationError, number> {
  if (!AMOUNT_FORMAT.test(text)) {
    return Either.left(
      new ValidationError(
        `La cantidad "${text}" no es un número válido: usá solo dígitos y punto decimal (por ejemplo, 12.5)`,
      ),
    );
  }
  return Either.right(Number(text));
}
