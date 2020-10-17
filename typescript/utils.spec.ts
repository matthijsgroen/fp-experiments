import { toChars, map, reduce, reduceWithStart, concat } from "./utils";

describe("toChars", () => {
  it("converts a string to an array of chars", () => {
    expect(toChars("hello")).toEqual(["h", "e", "l", "l", "o"]);
  });
});

describe("map", () => {
  describe("when empty", () => {
    it("produces an empty array", () => {
      const result = map((a: number) => a + 1)([]);
      expect(result).toEqual([]);
    });
  });

  describe("mapping elements", () => {
    it("converts each element in the list", () => {
      const result = map((a: number) => a + 1)([1, 2, 3]);
      expect(result).toEqual([2, 3, 4]);
    });
  });
});

describe("reduce", () => {
  describe("when empty", () => {
    it("returns undefined", () => {
      const result = reduce((acc: number) => (current: number) =>
        acc + current
      )([]);
      expect(result).toEqual(undefined);
    });
  });

  describe("when non-empty", () => {
    it("returns reduced result", () => {
      const result = reduce((acc: number) => (current: number) =>
        acc + current
      )([1, 2, 3, 4]);
      expect(result).toEqual(10);
    });
  });
});

describe("reduceWithStart", () => {
  describe("when empty", () => {
    it("returns start value", () => {
      const result = reduceWithStart((acc: number) => (current: number) =>
        acc + current
      )(4)([]);
      expect(result).toEqual(4);
    });
  });

  describe("when non-empty", () => {
    it("returns reduced result", () => {
      const result = reduceWithStart((acc: number) => (current: number) =>
        acc + current
      )(5)([1, 2, 3, 4]);
      expect(result).toEqual(15);
    });
  });

  describe("converting a to b", () => {
    it("returns converted result", () => {
      const result = reduceWithStart((acc: number) => (current: string) =>
        acc + current.length
      )(0)(["a", "bb", "ccc"]);
      expect(result).toEqual(6);
    });
  });
});

describe("concat", () => {
  it("appends 2 lists together", () => {
    const result = concat([1, 2, 3])([4, 5, 6]);
    expect(result).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
