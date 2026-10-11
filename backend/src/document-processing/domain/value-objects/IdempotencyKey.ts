import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { ValueObject } from "../../../shared/domain/ValueObject";

const MAX_LENGTH = 255;

// La clave que manda el cliente por intento de subida (header Idempotency-Key). Se guarda tal
// cual: es un identificador opaco, recortarla cambiaría qué clave es.
export class IdempotencyKey extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(raw: string): Either<ValidationError, IdempotencyKey> {
    if (raw.trim() === "" || raw.length > MAX_LENGTH) {
      return Either.left(new ValidationError(`La clave de idempotencia debe tener entre 1 y ${MAX_LENGTH} caracteres`));
    }
    return Either.right(new IdempotencyKey(raw));
  }
}
