import {
  toInputStream,
  head,
  tail,
  satisfy,
  isParseError,
  parse
} from "./parser";

describe("InputStream", () => {
  describe("head", () => {
    it("returns the first character available for parsing", () => {
      const stream = toInputStream("hello");
      const result = head(stream);
      expect(result).toEqual("h");
    });

    it("returns undefined when stream is empty", () => {
      const stream = toInputStream("");
      const result = head(stream);
      expect(result).toEqual(undefined);
    });
  });

  describe("tail", () => {
    it("returns the stream without first character", () => {
      const stream = tail(toInputStream("hello"));
      const result = head(stream);
      expect(result).toEqual("e");
    });

    it("returns empty stream after last char", () => {
      const stream = tail(toInputStream("h"));
      const result = head(stream);
      expect(result).toEqual(undefined);
    });

    it("returns undefined when stream is empty", () => {
      const stream = tail(toInputStream(""));
      const result = head(stream);
      expect(result).toEqual(undefined);
    });
  });
});

describe("satify", () => {
  describe("parsing a inputstream", () => {
    it("returns a ParseSuccess when successful", () => {
      const cParser = satisfy(c => c === "c");
      const result = cParser(toInputStream("ca"));
      expect(isParseError(result)).toEqual(false);
      if (!isParseError(result)) {
        expect(result.value).toEqual("c");
        expect(head(result.rest)).toEqual("a");
      }
    });

    it("returns a ParseError when unsuccessful", () => {
      const cParser = satisfy(c => c === "c");
      const result = cParser(toInputStream("ba"));
      expect(isParseError(result)).toEqual(true);
      if (isParseError(result)) {
        expect(result.encountered).toEqual("b");
        expect(result.message).toEqual("Unexpected 'b'");
        expect(head(result.rest)).toEqual("b");
      }
    });

    it("returns a ParseError when stream is empty", () => {
      const cParser = satisfy(c => c === "c");
      const result = cParser(toInputStream(""));
      expect(isParseError(result)).toEqual(true);
      if (isParseError(result)) {
        expect(result.encountered).toEqual("EOF");
        expect(result.message).toEqual("Unexpected EOF");
        expect(head(result.rest)).toEqual(undefined);
      }
    });
  });
});

describe("parse", () => {
  it("returns the parser result directly", () => {
    const cParser = satisfy(c => c === "c");
    const result = parse(cParser)("c");
    expect(result).toEqual("c");
  });

  it("returns an error on failure", () => {
    const cParser = satisfy(c => c === "c");
    const result = parse(cParser)("b");
    expect(isParseError(result)).toEqual(true);
  });

  it("returns an error when stream is not fully consumed", () => {
    const cParser = satisfy(c => c === "c");
    const result = parse(cParser)("cc");
    expect(isParseError(result)).toEqual(true);

    if (isParseError(result)) {
      expect(result.encountered).toEqual("c");
      expect(result.message).toEqual("Unexpected 'c', expected EOF");
      expect(head(result.rest)).toEqual("c");
    }
  });
});
