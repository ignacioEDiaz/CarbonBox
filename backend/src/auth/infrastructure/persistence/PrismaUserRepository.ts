import { Prisma, PrismaClient, User as UserRecord } from "../../../generated/prisma/client";
import { DuplicateEmailError } from "../../../shared/domain/errors";
import { User } from "../../domain/entities/User";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { Email } from "../../domain/value-objects/Email";

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async save(user: User): Promise<void> {
    try {
      await this.prismaClient.user.create({
        data: { id: user.id, email: user.email.value, passwordHash: user.passwordHash, createdAt: user.createdAt },
      });
    } catch (error) {
      // El índice único resuelve dos registros simultáneos con el mismo email
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new DuplicateEmailError(`Ya existe una cuenta con el email ${user.email.value}`);
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prismaClient.user.findUnique({ where: { email } });
    return record === null ? null : toDomain(record);
  }
}

function toDomain(record: UserRecord): User {
  const email = Email.create(record.email);
  if (email.isLeft()) {
    throw new Error(`Usuario ${record.id} con email inválido en la base`);
  }
  return User.restore({ id: record.id, email: email.value, passwordHash: record.passwordHash, createdAt: record.createdAt });
}
