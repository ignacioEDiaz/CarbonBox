import { ScryptPasswordHasher } from "../../../../src/auth/infrastructure/security/ScryptPasswordHasher";

const hasher = new ScryptPasswordHasher();

describe("ScryptPasswordHasher", () => {
  it("el hash no contiene la contraseña y la verifica", async () => {
    const hash = await hasher.hash("mi-contraseña");

    expect(hash).toMatch(/^scrypt\$[0-9a-f]+\$[0-9a-f]+$/);
    expect(hash).not.toContain("mi-contraseña");
    await expect(hasher.verify("mi-contraseña", hash)).resolves.toBe(true);
  });

  it("rechaza otra contraseña", async () => {
    const hash = await hasher.hash("mi-contraseña");

    await expect(hasher.verify("otra-contraseña", hash)).resolves.toBe(false);
  });

  it("dos hashes de la misma contraseña son distintos (sal aleatoria)", async () => {
    expect(await hasher.hash("igual-igual")).not.toBe(await hasher.hash("igual-igual"));
  });

  it("un hash con otro formato no verifica", async () => {
    await expect(hasher.verify("x", "texto-plano")).resolves.toBe(false);
  });
});
