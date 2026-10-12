import jwt from "jsonwebtoken";
import { IConvictProps } from "../../../config/IConvictProps";
import { ITokenService } from "../../application/security/ITokenService";

// JWT firmado con HS256: el userId va en "sub" y el vencimiento en "exp"
export class JwtTokenService implements ITokenService {
  private readonly secret: string;
  private readonly expiresInSeconds: number;

  constructor(config: IConvictProps) {
    this.secret = config.jwt.secret;
    this.expiresInSeconds = config.jwt.expiresInSeconds;
  }

  sign(userId: string): string {
    return jwt.sign({}, this.secret, { algorithm: "HS256", subject: userId, expiresIn: this.expiresInSeconds });
  }

  // Se fija el algoritmo al verificar: así nadie puede mandar un token con "alg: none"
  verify(token: string): string | null {
    try {
      const payload = jwt.verify(token, this.secret, { algorithms: ["HS256"] });
      return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
    } catch {
      return null; // firma inválida, vencido o mal formado: para quien llama es lo mismo
    }
  }
}
