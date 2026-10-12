import jwt from "jsonwebtoken";
import { JwtTokenService } from "../../../../../src/shared/infrastructure/security/JwtTokenService";
import { testConfig } from "../../../../support/testConfig";

const service = new JwtTokenService(testConfig());

describe("JwtTokenService", () => {
  it("firma un token y devuelve el userId al verificarlo", () => {
    expect(service.verify(service.sign("user-1"))).toBe("user-1");
  });

  it("devuelve null para un token firmado con otro secreto", () => {
    const forged = jwt.sign({ sub: "user-1" }, "otro-secreto-de-al-menos-32-caracteres-x", { algorithm: "HS256" });

    expect(service.verify(forged)).toBeNull();
  });

  it("devuelve null para un token vencido", () => {
    const pastSeconds = Math.floor(Date.now() / 1000) - 10;
    const expired = jwt.sign({ sub: "user-1", exp: pastSeconds }, testConfig().jwt.secret, { algorithm: "HS256" });

    expect(service.verify(expired)).toBeNull();
  });

  it("devuelve null para un texto que no es un token", () => {
    expect(service.verify("no-es-un-jwt")).toBeNull();
  });
});
