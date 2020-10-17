import { toChars } from "./utils";

export type InputStream = string[];

export type ParseError = {
  message: string;
  encountered: string;
  rest: InputStream;
};

export type ParseSuccess<T> = {
  value: T;
  rest: InputStream;
};

export type ParseResult<T> = ParseSuccess<T> | ParseError;
export type Parser<T> = (stream: InputStream) => ParseResult<T>;

export const toInputStream = (text: string): InputStream => toChars(text);

export const head = (stream: InputStream): string => stream[0];
export const tail = ([, ...tail]: InputStream): InputStream => tail;

export const satisfy = (
  predicate: (input: string) => boolean
): Parser<string> => input =>
  (head =>
    head === undefined
      ? { message: "Unexpected EOF", encountered: "EOF", rest: input }
      : predicate(head)
      ? { value: head, rest: tail(input) }
      : {
          message: `Unexpected '${head}'`,
          encountered: head,
          rest: input
        })(head(input));

export const isParseError = <T>(
  result: ParseResult<T> | unknown
): result is ParseError =>
  typeof result === "object" && result !== null && "message" in result;

const unpack = <T>(result: ParseResult<T>): T | ParseError =>
  isParseError(result)
    ? result
    : (head =>
        head !== undefined
          ? {
              message: `Unexpected '${head}', expected EOF`,
              encountered: head,
              rest: result.rest
            }
          : result.value)(head(result.rest));

export const parse = <T>(parser: Parser<T>) => (
  input: string
): ParseError | T => unpack(parser(toInputStream(input)));
