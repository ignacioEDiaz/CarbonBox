import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { ValueObject } from "../../../shared/domain/ValueObject";

export const EXPECTED_CSV_COLUMNS = ["category", "amount", "unit", "date"] as const;
const EXPECTED_HEADER = EXPECTED_CSV_COLUMNS.join(",");

// Un archivo binario sin saltos de línea no se recorre entero: el encabezado está al principio
const MAX_HEADER_BYTES = 1024;
const NEWLINE = 0x0a;
const MAX_PREVIEW_LENGTH = 100;

// La primera línea del CSV. La regla la comparten la subida (spec 003) y el parser (spec 004),
// así las dos nunca aceptan formatos distintos.
export class CsvHeader extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static fromContent(content: Uint8Array): Either<ValidationError, CsvHeader> {
    const line = readFirstLine(content);
    const columns = line.split(",").map((column) => column.trim().toLowerCase());
    if (columns.join(",") !== EXPECTED_HEADER) {
      return Either.left(
        new ValidationError(`El encabezado debe ser "${EXPECTED_HEADER}" y llegó "${preview(line)}"`),
      );
    }
    return Either.right(new CsvHeader(EXPECTED_HEADER));
  }
}

// TextDecoder ya descarta la marca BOM del principio; queda sacar el \r de los saltos de Windows
function readFirstLine(content: Uint8Array): string {
  const start = content.subarray(0, MAX_HEADER_BYTES);
  const newlineIndex = start.indexOf(NEWLINE);
  const lineBytes = newlineIndex === -1 ? start : start.subarray(0, newlineIndex);
  return new TextDecoder().decode(lineBytes).replace(/\r$/, "");
}

function preview(line: string): string {
  return line.length > MAX_PREVIEW_LENGTH ? `${line.slice(0, MAX_PREVIEW_LENGTH)}...` : line;
}
