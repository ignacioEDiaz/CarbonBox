// Resultado de una operación: Left (error) o Right (éxito), nunca las dos cosas.
// Permite devolver errores esperables en lugar de lanzarlos.

export class Left<L, R> {
  constructor(readonly value: L) {}

  isLeft(): this is Left<L, R> {
    return true;
  }

  isRight(): this is Right<L, R> {
    return false;
  }
}

export class Right<L, R> {
  constructor(readonly value: R) {}

  isLeft(): this is Left<L, R> {
    return false;
  }

  isRight(): this is Right<L, R> {
    return true;
  }
}

export type Either<L, R> = Left<L, R> | Right<L, R>;

// Mismo nombre que el tipo para poder escribir Either.left(...) y Either.right(...)
export const Either = {
  left: <L, R>(value: L): Either<L, R> => new Left(value),
  right: <L, R>(value: R): Either<L, R> => new Right(value),
};
