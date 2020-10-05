import { onSuccess, onError } from "./combinators";
import { ParseSuccess, toInputStream, ParseError } from "./parser";

describe("onSuccess", () => {
  it("allows chaining when input is ParseSuccess", () => {
    const parseSuccess: ParseSuccess<string> = {
      value: "result",
      rest: toInputStream("rest")
    };
    const next = (success: ParseSuccess<string>) => ({
      rest: success.rest,
      value: "updatedResult"
    });

    const result = onSuccess(parseSuccess)(next) as ParseSuccess<string>;
    expect(result.value).toEqual("updatedResult");
  });

  it("returns the input if it is a ParseError", () => {
    const parseError: ParseError = {
      message: "Error",
      encountered: "Error",
      rest: toInputStream("rest")
    };
    const next = jest.fn();
    const result = onSuccess(parseError)(next) as ParseError;
    expect(result.message).toEqual("Error");
    expect(next).not.toHaveBeenCalled();
  });
});

describe("onError", () => {
  it("allows chaining when input is ParseError", () => {
    const parseError: ParseError = {
      message: "Error",
      encountered: "Error",
      rest: toInputStream("rest")
    };
    const next = (error: ParseError) => ({
      rest: error.rest,
      value: "updatedResult"
    });
    const result = onError(parseError)(next) as ParseSuccess<string>;
    expect(result.value).toEqual("updatedResult");
  });

  it("returns the input if it is a ParseSuccess", () => {
    const parseSuccess: ParseSuccess<string> = {
      value: "result",
      rest: toInputStream("rest")
    };
    const next = jest.fn();

    const result = onError(parseSuccess)(next) as ParseSuccess<string>;
    expect(result.value).toEqual("result");
    expect(next).not.toHaveBeenCalled();
  });
});
