import { Either } from "../../../../src/shared/domain/Either";

describe("Either", () => {
  it("right representa un éxito con su valor", () => {
    const result: Either<Error, number> = Either.right(5);

    expect(result.isRight()).toBe(true);
    expect(result.isLeft()).toBe(false);
    expect(result.value).toBe(5);
  });

  it("left representa un error con su causa", () => {
    const error = new Error("x");
    const result: Either<Error, number> = Either.left(error);

    expect(result.isLeft()).toBe(true);
    expect(result.isRight()).toBe(false);
    expect(result.value).toBe(error);
  });
});
