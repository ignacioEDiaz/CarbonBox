import { InfoRecord, parse } from "csv-parse/sync";
import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { ActivityData } from "../../domain/entities/ActivityData";
import { EXPECTED_CSV_COLUMNS } from "../../domain/value-objects/CsvHeader";
import { CsvParseResult, ICsvParserService, RowError } from "./ICsvParserService";

// Solo dígitos, con punto decimal opcional: Number() solo aceptaría "", "1e3" o "0x10"
const AMOUNT_FORMAT = /^\d+(\.\d+)?$/;

type CsvRow = { fields: string[]; line: number };

// Convierte el CSV crudo en filas de ActivityData. Las reglas de cada fila son las de la
// entidad: acá solo se lee el texto, se cuentan las columnas y se convierte la cantidad.
export class CsvParserService implements ICsvParserService {
  parse(content: Uint8Array, uploadId: string): Either<ValidationError, CsvParseResult> {
    const text = new TextDecoder().decode(content);
    const rows = readRows(text);
    return Either.right(classifyRows(rows, uploadId));
  }
}

function readRows(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  parse(text, {
    from_line: 2, // la línea 1 es el encabezado
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // otra cantidad de columnas es un error de esa fila, no del archivo
    on_record: (fields: string[], context: InfoRecord) => {
      rows.push({ fields, line: context.lines });
      return fields;
    },
  });
  return rows;
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
