import { loadConfig } from "../../../src/config";

const DATABASE_URL = "postgresql://u:p@h:5432/db";

describe("loadConfig", () => {
  it("lee el puerto y la URL de la base desde el entorno", () => {
    const config = loadConfig({ PORT: "4000", DATABASE_URL });

    expect(config.port).toBe(4000);
    expect(config.database.url).toBe(DATABASE_URL);
  });

  it("usa el puerto 3000 si no se define PORT", () => {
    const config = loadConfig({ DATABASE_URL });

    expect(config.port).toBe(3000);
  });

  it("falla nombrando database.url si falta DATABASE_URL", () => {
    expect(() => loadConfig({ PORT: "3000" })).toThrow(/database\.url/);
  });

  it("falla nombrando database.url si DATABASE_URL está vacía", () => {
    expect(() => loadConfig({ DATABASE_URL: "" })).toThrow(/database\.url/);
  });

  it("falla nombrando port si PORT no es un número", () => {
    expect(() => loadConfig({ PORT: "abc", DATABASE_URL })).toThrow(/port/);
  });

  it("no muestra la contraseña de la base en el mensaje de error", () => {
    const urlConPassword = "postgresql://postgres:secreta@localhost:5432/db";

    expect(() => loadConfig({ PORT: "abc", DATABASE_URL: urlConPassword })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("secreta") }),
    );
  });
});
