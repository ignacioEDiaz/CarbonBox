import { IQueryHandler } from "../../../../shared/application/IQueryHandler";
import { ITokenService } from "../../../../shared/application/security/ITokenService";
import { Either } from "../../../../shared/domain/Either";
import { UnauthorizedError } from "../../../../shared/domain/errors";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { Email } from "../../../domain/value-objects/Email";
import { IPasswordHasher } from "../../ports/IPasswordHasher";
import { LoginQuery } from "../objects/LoginQuery";

export type Session = { token: string };

// Siempre el mismo mensaje: decir "ese email no existe" le confirmaría a un atacante qué cuentas hay
const INVALID_CREDENTIALS = "Email o contraseña incorrectos";

export class LoginQueryHandler implements IQueryHandler<LoginQuery, Session> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(query: LoginQuery): Promise<Either<Error, Session>> {
    const emailOrError = Email.create(query.email);
    if (emailOrError.isLeft()) {
      return Either.left(new UnauthorizedError(INVALID_CREDENTIALS));
    }
    const user = await this.userRepository.findByEmail(emailOrError.value.value);
    if (user === null || !(await this.passwordHasher.verify(query.password, user.passwordHash))) {
      return Either.left(new UnauthorizedError(INVALID_CREDENTIALS));
    }
    return Either.right({ token: this.tokenService.sign(user.id) });
  }
}
