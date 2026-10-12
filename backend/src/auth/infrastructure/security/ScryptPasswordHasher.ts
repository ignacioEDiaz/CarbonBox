import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { IPasswordHasher } from "../../application/ports/IPasswordHasher";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

// scrypt viene con Node (sin dependencias nativas) y es lento a propósito: adivinar contraseñas
// por fuerza bruta cuesta caro. Se guarda "scrypt$<sal>$<hash>", con una sal aleatoria por usuario.
export class ScryptPasswordHasher implements IPasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derived = await deriveKey(password, salt);
    return `scrypt$${salt}$${derived.toString("hex")}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const [algorithm, salt, expectedHex] = hash.split("$");
    if (algorithm !== "scrypt" || salt === undefined || expectedHex === undefined) {
      return false;
    }
    const expected = Buffer.from(expectedHex, "hex");
    const derived = await deriveKey(password, salt);
    // timingSafeEqual tarda lo mismo acierte o no: no da pistas por el tiempo de respuesta
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  }
}

async function deriveKey(password: string, salt: string): Promise<Buffer> {
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  if (!Buffer.isBuffer(derived)) {
    throw new Error("scrypt no devolvió un Buffer");
  }
  return derived;
}
