import { ICommandHandler } from "../../../../shared/application/ICommandHandler";
import { Either } from "../../../../shared/domain/Either";
import { ConflictError, DuplicateEmailError } from "../../../../shared/domain/errors";
import { User } from "../../../domain/entities/User";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { Email } from "../../../domain/value-objects/Email";
import { Password } from "../../../domain/value-objects/Password";
import { IPasswordHasher } from "../../ports/IPasswordHasher";
import { RegisterUserCommand } from "../objects/RegisterUserCommand";

export type RegisteredUser = { id: string; email: string };

export class RegisterUserCommandHandler implements ICommandHandler<RegisterUserCommand, RegisteredUser> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(command: RegisterUserCommand): Promise<Either<Error, RegisteredUser>> {
    const emailOrError = Email.create(command.email);
    if (emailOrError.isLeft()) {
      return Either.left(emailOrError.value);
    }
    const passwordOrError = Password.create(command.password);
    if (passwordOrError.isLeft()) {
      return Either.left(passwordOrError.value);
    }
    const user = User.create({
      email: emailOrError.value,
      passwordHash: await this.passwordHasher.hash(passwordOrError.value.value),
    });
    // No se busca antes si existe: el índice único es lo que resuelve dos registros a la vez
    try {
      await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        return Either.left(new ConflictError("Ya existe una cuenta con ese email"));
      }
      throw error;
    }
    return Either.right({ id: user.id, email: user.email.value });
  }
}
