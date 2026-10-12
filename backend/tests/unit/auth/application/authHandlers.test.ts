import { RegisterUserCommandHandler } from "../../../../src/auth/application/commands/handlers/RegisterUserCommandHandler";
import { RegisterUserCommand } from "../../../../src/auth/application/commands/objects/RegisterUserCommand";
import { LoginQueryHandler } from "../../../../src/auth/application/queries/handlers/LoginQueryHandler";
import { LoginQuery } from "../../../../src/auth/application/queries/objects/LoginQuery";
import { ConflictError, UnauthorizedError, ValidationError } from "../../../../src/shared/domain/errors";
import { FakePasswordHasher, FakeTokenService, InMemoryUserRepository } from "../../../support/authDoubles";

function setup() {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  return {
    users,
    register: new RegisterUserCommandHandler(users, hasher),
    login: new LoginQueryHandler(users, hasher, new FakeTokenService()),
  };
}

describe("RegisterUserCommandHandler", () => {
  it("crea la cuenta con el email normalizado y guarda el hash, no la contraseña", async () => {
    const { users, register } = setup();

    const result = await register.execute(new RegisterUserCommand("Ana@Mail.com", "contraseña-1"));

    expect(result.isRight() && result.value).toEqual({ id: expect.any(String), email: "ana@mail.com" });
    expect(users.users.get("ana@mail.com")?.passwordHash).toBe("hash(contraseña-1)");
  });

  it.each([
    { email: "ana", password: "contraseña-1", message: "El email no es válido" },
    { email: "ana@mail.com", password: "corta", message: "La contraseña debe tener entre 8 y 72 caracteres" },
  ])("rechaza $email / $password con un error de validación", async ({ email, password, message }) => {
    const result = await setup().register.execute(new RegisterUserCommand(email, password));

    expect(result.isLeft() && result.value).toEqual(new ValidationError(message));
  });

  it("devuelve ConflictError si el email ya tiene cuenta", async () => {
    const { register } = setup();
    await register.execute(new RegisterUserCommand("ana@mail.com", "contraseña-1"));

    const result = await register.execute(new RegisterUserCommand("ANA@mail.com", "otra-contraseña"));

    expect(result.isLeft() && result.value).toEqual(new ConflictError("Ya existe una cuenta con ese email"));
  });
});

describe("LoginQueryHandler", () => {
  it("con las credenciales correctas devuelve un token para el usuario", async () => {
    const { users, register, login } = setup();
    await register.execute(new RegisterUserCommand("ana@mail.com", "contraseña-1"));

    const result = await login.execute(new LoginQuery("Ana@Mail.com", "contraseña-1"));

    expect(result.isRight() && result.value).toEqual({ token: `token-de-${users.users.get("ana@mail.com")?.id}` });
  });

  it.each([
    { label: "contraseña incorrecta", email: "ana@mail.com", password: "equivocada" },
    { label: "email sin cuenta", email: "nadie@mail.com", password: "contraseña-1" },
    { label: "email mal escrito", email: "ana", password: "contraseña-1" },
  ])("con $label responde el mismo error, sin decir cuál falló", async ({ email, password }) => {
    const { register, login } = setup();
    await register.execute(new RegisterUserCommand("ana@mail.com", "contraseña-1"));

    const result = await login.execute(new LoginQuery(email, password));

    expect(result.isLeft() && result.value).toEqual(new UnauthorizedError("Email o contraseña incorrectos"));
  });
});
