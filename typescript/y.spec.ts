import Y, { PointFix } from "./y";

describe("Y combinator", () => {
  describe("creates support for recursion", () => {
    test("fibonacci", () => {
      const fibonacci: PointFix<number, number> = f => n =>
        n < 2 ? 1 : f(n - 1) + f(n - 2);

      expect(Y(fibonacci)(2)).toEqual(2);
      expect(Y(fibonacci)(3)).toEqual(3);
      expect(Y(fibonacci)(4)).toEqual(5);
      expect(Y(fibonacci)(5)).toEqual(8);
    });

    test("factorial", () => {
      const factorial: PointFix<number, number> = f => n =>
        n === 0 ? 1 : n * f(n - 1);

      expect(Y(factorial)(2)).toEqual(2);
      expect(Y(factorial)(3)).toEqual(6);
      expect(Y(factorial)(4)).toEqual(24);
      expect(Y(factorial)(5)).toEqual(120);
    });
  });
});
