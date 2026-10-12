import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { ValueObject } from "../../../shared/domain/ValueObject";

const MIN_LENGTH = 8;
const MAX_LENGTH = 72; // límite habitual: contraseñas más largas no suman seguridad y cuestan más de hashear

// La contraseña en texto plano, validada. Solo vive en memoria: se guarda únicamente su hash.
export class Password extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  // No se recorta: un espacio es un carácter válido de una contraseña
  static create(raw: string): Either<ValidationError, Password> {
    if (raw.length < MIN_LENGTH || raw.length > MAX_LENGTH) {
      return Either.left(
        new ValidationError(`La contraseña debe tener entre ${MIN_LENGTH} y ${MAX_LENGTH} caracteres`),
      );
    }
    return Either.right(new Password(raw));
  }
}
