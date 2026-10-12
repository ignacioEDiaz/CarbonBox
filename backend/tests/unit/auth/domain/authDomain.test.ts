import { User } from "../../../../src/auth/domain/entities/User";
import { Email } from "../../../../src/auth/domain/value-objects/Email";
import { Password } from "../../../../src/auth/domain/value-objects/Password";
import { ValidationError } from "../../../../src/shared/domain/errors";

describe("Email", () => {
  it("recorta y pasa a minúsculas: Ana@Mail.com y ana@mail.com son la misma cuenta", () => {
    const email = Email.create("  Ana@Mail.COM ");

    expect(email.isRight() && email.value.value).toBe("ana@mail.com");
  });

  it.each(["", "ana", "ana@", "@mail.com", "ana@mail", "ana mail@x.com"])("rechaza %p", (raw) => {
    const email = Email.create(raw);

    expect(email.isLeft() && email.value).toEqual(new ValidationError("El email no es válido"));
  });
});

describe("Password", () => {
  it("acepta de 8 a 72 caracteres, sin recortar espacios", () => {
    expect(Password.create(" 12345678 ").isRight()).toBe(true);
    expect(Password.create("a".repeat(72)).isRight()).toBe(true);
  });

  it.each(["1234567", "a".repeat(73), ""])("rechaza una contraseña de %p caracteres", (raw) => {
    const password = Password.create(raw);

    expect(password.isLeft() && password.value).toEqual(
      new ValidationError("La contraseña debe tener entre 8 y 72 caracteres"),
    );
  });
});

describe("User", () => {
  it("se crea con id propio, el email y el hash (nunca la contraseña)", () => {
    const email = Email.create("ana@mail.com");
    if (email.isLeft()) throw email.value;

    const user = User.create({ email: email.value, passwordHash: "scrypt$sal$hash" });

    expect(user.id).not.toBe("");
    expect([user.email.value, user.passwordHash]).toEqual(["ana@mail.com", "scrypt$sal$hash"]);
    expect(user.createdAt).toBeInstanceOf(Date);
  });
});
