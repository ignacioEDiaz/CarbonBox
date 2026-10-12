import { JwtTokenService } from "../../src/shared/infrastructure/security/JwtTokenService";
import { testConfig } from "./testConfig";

// El header de una sesión válida, firmado con el mismo secreto que usa testConfig
export function authHeader(userId = "user-123"): { authorization: string } {
  return { authorization: `Bearer ${new JwtTokenService(testConfig()).sign(userId)}` };
}
