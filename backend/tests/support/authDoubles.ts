import { IPasswordHasher } from "../../src/auth/application/ports/IPasswordHasher";
import { User } from "../../src/auth/domain/entities/User";
import { IUserRepository } from "../../src/auth/domain/repositories/IUserRepository";
import { ITokenService } from "../../src/shared/application/security/ITokenService";
import { DuplicateEmailError } from "../../src/shared/domain/errors";

export class InMemoryUserRepository implements IUserRepository {
  readonly users = new Map<string, User>();

  async save(user: User): Promise<void> {
    if (this.users.has(user.email.value)) {
      throw new DuplicateEmailError(`Ya existe ${user.email.value}`);
    }
    this.users.set(user.email.value, user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.get(email) ?? null;
  }
}

// Hash falso y legible: alcanza para probar que el handler guarda el hash y no la contraseña
export class FakePasswordHasher implements IPasswordHasher {
  async hash(password: string): Promise<string> {
    return `hash(${password})`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return hash === `hash(${password})`;
  }
}

export class FakeTokenService implements ITokenService {
  sign(userId: string): string {
    return `token-de-${userId}`;
  }

  verify(token: string): string | null {
    return token.startsWith("token-de-") ? token.slice("token-de-".length) : null;
  }
}
