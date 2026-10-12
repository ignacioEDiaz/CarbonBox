import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { ValueObject } from "../../../shared/domain/ValueObject";

// Algo@algo.algo, sin espacios: no pretende validar todo el estándar, solo lo razonable
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  // En minúsculas y sin espacios alrededor: Ana@Mail.com y ana@mail.com son la misma cuenta
  static create(raw: string): Either<ValidationError, Email> {
    const email = raw.trim().toLowerCase();
    if (!EMAIL_FORMAT.test(email)) {
      return Either.left(new ValidationError("El email no es válido"));
    }
    return Either.right(new Email(email));
  }
}
