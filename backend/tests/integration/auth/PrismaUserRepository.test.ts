import { randomUUID } from "node:crypto";
import { User } from "../../../src/auth/domain/entities/User";
import { Email } from "../../../src/auth/domain/value-objects/Email";
import { PrismaUserRepository } from "../../../src/auth/infrastructure/persistence/PrismaUserRepository";
import { DuplicateEmailError } from "../../../src/shared/domain/errors";
import { createTestPrismaClient } from "../testPrismaClient";

const prisma = createTestPrismaClient();
const repository = new PrismaUserRepository(prisma);

afterAll(async () => {
  await prisma.$disconnect();
});

// Un email propio por test: la base de tests no se limpia
function newUser(): User {
  const email = Email.create(`${randomUUID()}@mail.com`);
  if (email.isLeft()) throw email.value;
  return User.create({ email: email.value, passwordHash: "scrypt$sal$hash" });
}

describe("PrismaUserRepository", () => {
  it("guarda un usuario y lo encuentra por email", async () => {
    const user = newUser();

    await repository.save(user);
    const found = await repository.findByEmail(user.email.value);

    expect([found?.id, found?.email.value, found?.passwordHash]).toEqual([user.id, user.email.value, "scrypt$sal$hash"]);
  });

  it("devuelve null si el email no está registrado", async () => {
    expect(await repository.findByEmail("nadie@mail.com")).toBeNull();
  });

  it("lanza DuplicateEmailError si el email ya existe", async () => {
    const user = newUser();
    await repository.save(user);
    const sameEmail = User.create({ email: user.email, passwordHash: "otro" });

    await expect(repository.save(sameEmail)).rejects.toBeInstanceOf(DuplicateEmailError);
  });
});
