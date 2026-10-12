// Cómo se protege una contraseña. Los handlers no saben qué algoritmo se usa.
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}
