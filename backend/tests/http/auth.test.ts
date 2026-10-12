import { asValue } from "awilix";
import { App } from "../../src/main/App";
import { buildContainer } from "../../src/main/container";
import { InMemoryUserRepository } from "../support/authDoubles";
import { testConfig } from "../support/testConfig";

// App real (hasher scrypt y JWT de verdad) con la base de usuarios en memoria
function buildApp() {
  const container = buildContainer(testConfig());
  container.register({ userRepository: asValue(new InMemoryUserRepository()) });
  return new App(container, { logger: false });
}

const CREDENTIALS = { email: "ana@mail.com", password: "contraseña-1" };

describe("POST /api/v1/auth/register y /login", () => {
  it("registra (201), inicia sesión (200) y devuelve un token", async () => {
    const app = buildApp();

    const register = await app.server.inject({ method: "POST", url: "/api/v1/auth/register", payload: CREDENTIALS });
    const login = await app.server.inject({ method: "POST", url: "/api/v1/auth/login", payload: CREDENTIALS });

    expect([register.statusCode, register.json().email]).toEqual([201, "ana@mail.com"]);
    expect(login.statusCode).toBe(200);
    expect(login.json().token).toEqual(expect.any(String));
    await app.server.close();
  });

  it("un email repetido responde 409 y credenciales incorrectas 401", async () => {
    const app = buildApp();
    await app.server.inject({ method: "POST", url: "/api/v1/auth/register", payload: CREDENTIALS });

    const again = await app.server.inject({ method: "POST", url: "/api/v1/auth/register", payload: CREDENTIALS });
    const wrong = await app.server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { ...CREDENTIALS, password: "equivocada" },
    });

    expect(again.statusCode).toBe(409);
    expect([wrong.statusCode, wrong.json().error.type]).toEqual([401, "UNAUTHORIZED"]);
    await app.server.close();
  });
});
