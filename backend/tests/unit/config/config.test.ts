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
});
