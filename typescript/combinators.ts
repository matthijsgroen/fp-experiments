import { map, reduce, concat, toChars } from "./utils";
import Y from "./y";
import {
  InputStream,
  ParseError,
  ParseResult,
  ParseSuccess,
  Parser,
  isParseError,
  satisfy
} from "./parser";

export const onSuccess = <A>(result: ParseResult<A>) => <B>(
  next: (success: ParseSuccess<A>) => ParseResult<B>
): ParseResult<B> => (isParseError(result) ? result : next(result));

export const onError = <A>(result: ParseResult<A>) => <B>(
  next: (error: ParseError) => ParseResult<B>
): ParseResult<A | B> => (isParseError(result) ? next(result) : result);

export const addLabel = (label: string) => <T>(
  parser: Parser<T>
): Parser<T> => (input: InputStream) =>
  onError(parser(input))(error => ({
    message: `Expected '${label}', got '${error.encountered}'`,
    rest: error.rest,
    encountered: error.encountered
  }));

export const charParser = (char: string): Parser<string> =>
  addLabel(char)(satisfy(c => c === char));

export const chainResult = <A>(a: ParseSuccess<A>) => <B>(
  b: ParseResult<B>
): ParseResult<[A, B]> =>
  isParseError(b) ? b : { value: [a.value, b.value], rest: b.rest };

export const valueResult = <T>(value: T) => (p: Parser<unknown>): Parser<T> => (
  input: InputStream
) =>
  onSuccess(p(input))(result => ({
    value,
    rest: result.rest
  }));

export const andThen = <A>(a: Parser<A>) => <B>(
  b: Parser<B>
): Parser<[A, B]> => (input: InputStream) =>
  onSuccess(a(input))(result => chainResult(result)(b(result.rest)));

export const orElse = <A>(left: Parser<A>) => <B>(
  right: Parser<B>
): Parser<A | B> => (input: InputStream) =>
  onError(left(input))(() => right(input));

export const resultParser = <A>(value: A): Parser<A> => input => ({
  value,
  rest: input
});

export const opt = (parser: Parser<string>) => orElse(parser)(resultParser(""));
export const choice = reduce(orElse);
export const chain = reduce(
  (previous: Parser<string>) => (current: Parser<string>) =>
    toString(andThen(previous)(current))
);

export const anyOf = (x: string[]): Parser<string> =>
  choice(map(charParser)(x));

export const mapResult = <A, B>(transform: (input: A) => B) => (
  parser: Parser<A>
) => (input: InputStream): ParseResult<B> =>
  onSuccess(parser(input))(result => ({
    value: transform(result.value),
    rest: result.rest
  }));

const toList = mapResult(<T>(x: [T[], T[]]) => concat(x[0])(x[1]));

export const many = <T>(p: Parser<T>): Parser<T[]> =>
  Y<InputStream, ParseResult<T[]>>(f => stream =>
    orElse(toList(andThen(mapResult((e: T) => [e])(p))(f)))(
      resultParser([] as T[])
    )(stream)
  );

export const some = <T>(parser: Parser<T>) =>
  toList(andThen(mapResult((e: T) => [e])(parser))(many(parser)));

export const mergeStringResult = mapResult<string[], string>(a =>
  reduce((a: string) => b => a + b)(a)
);

export const andThenLeft = <A>(a: Parser<A>) => <B>(b: Parser<B>): Parser<A> =>
  mapResult((result: [A, B]) => result[0])(andThen(a)(b));

export const andThenRight = <A>(a: Parser<A>) => <B>(b: Parser<B>): Parser<B> =>
  mapResult((result: [A, B]) => result[1])(andThen(a)(b));

export const between = <A>(a: Parser<A>) => <B>(b: Parser<B>) => <C>(
  c: Parser<C>
): Parser<C> => andThenLeft(andThenRight(a)(c))(b);

export const stringParser = (sequence: string): Parser<string> =>
  addLabel(sequence)(
    reduce<Parser<string>>(previous => next =>
      mergeStringResult(andThen(previous)(next))
    )(map(charParser)(toChars(sequence)))
  );

const join = (a: string) => (b: string) => a + b;
export const toString = mapResult(reduce(join));

export const sepBy1 = <A>(sepParser: Parser<A>) => <B>(
  parser: Parser<B>
): Parser<B[]> =>
  mapResult((result: [B, B[]]) => concat([result[0]])(result[1]))(
    andThen(parser)(many(andThenRight(sepParser)(parser)))
  );

export const sepBy = <A>(sepParser: Parser<A>) => <B>(
  parser: Parser<B>
): Parser<B[]> => orElse(sepBy1(sepParser)(parser))(resultParser([] as B[]));
