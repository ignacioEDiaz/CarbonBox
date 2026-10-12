// Tokens de sesión. Lo usan el login (para firmar) y las rutas protegidas (para verificar).
export interface ITokenService {
  sign(userId: string): string;
  // El userId del token, o null si es inválido, ajeno o venció
  verify(token: string): string | null;
}
