import { User } from "../entities/User";

export interface IUserRepository {
  // Si el email ya está registrado, lanza DuplicateEmailError
  save(user: User): Promise<void>;
  findByEmail(email: string): Promise<User | null>;
}
