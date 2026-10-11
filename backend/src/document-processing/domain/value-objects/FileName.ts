import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { ValueObject } from "../../../shared/domain/ValueObject";

// Al menos un carácter antes de ".csv", sin distinguir mayúsculas
const CSV_FILE_NAME = /^.+\.csv$/i;

export class FileName extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  // Única forma de crear un FileName: si devuelve right, el nombre es válido
  static create(raw: string): Either<ValidationError, FileName> {
    const name = raw.trim();
    if (name === "") {
      return Either.left(new ValidationError("El nombre del archivo no puede estar vacío"));
    }
    if (!CSV_FILE_NAME.test(name)) {
      return Either.left(
        new ValidationError(`El archivo "${name}" debe ser un .csv con nombre (por ejemplo, datos.csv)`),
      );
    }
    return Either.right(new FileName(name));
  }
}
