// Errores esperables del dominio. No saben nada de HTTP: la traducción vive en errorHandler.

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Dos subidas con la misma clave de idempotencia: la segunda no se guarda. No llega al cliente:
// el handler la atrapa y responde con el upload que ganó.
export class DuplicateIdempotencyKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateIdempotencyKeyError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// Falta la sesión, el token es inválido o venció, o las credenciales son incorrectas
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// El pedido choca con algo que ya existe (un email registrado, una clave ya usada)
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

// Un registro con un email que ya tiene cuenta. El handler lo traduce a ConflictError (409).
export class DuplicateEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateEmailError";
  }
}
