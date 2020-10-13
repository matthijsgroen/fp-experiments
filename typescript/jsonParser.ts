import Y from "./y";
import { map, reduceWithStart } from "./utils";
import {
  Parser,
  parse,
  satisfy,
  ParseResult,
  InputStream,
  isParseError,
  toInputStream,
} from "./parser";
import {
  addLabel,
  andThen,
  andThenLeft,
  andThenRight,
  anyOf,
  between,
  charParser,
  chain,
  choice,
  many,
  mapResult,
  onError,
  opt,
  orElse,
  sepBy,
  some,
  stringParser,
  toString,
  valueResult,
} from "./combinators";

type JSONValue =
  | null
  | boolean
  | string
  | number
  | JSONValue[]
  | { [key: string]: JSONValue };

type JSONObject = { [key: string]: JSONValue };

const whitespaceParser = many(anyOf([" ", "\n", "\t"]));
const nullParser = valueResult(null)(stringParser("null"));

const trueParser = valueResult(true)(stringParser("true"));
const falseParser = valueResult(false)(stringParser("false"));
const boolParser = addLabel("boolean")(orElse(trueParser)(falseParser));

const stringCharParser = satisfy((c) => c !== '"' && c !== "\\");
const specialCharacters: [string, string][] = [
  ['\\"', '"'],
  ["\\\\", "\\"],
  ["\\/", "/"],
  ["\\b", "\b"],
  ["\\f", "\f"],
  ["\\n", "\n"],
  ["\\r", "\r"],
  ["\\t", "\t"],
];
const escapedCharParser = choice(
  map(([match, result]: [string, string]) =>
    valueResult(result)(stringParser(match))
  )(specialCharacters)
);
const quoteParser = charParser('"');
const quotedStringParser = addLabel("string")(
  toString(
    between(quoteParser)(quoteParser)(
      many(orElse(stringCharParser)(escapedCharParser))
    )
  )
);

const optSign = opt(charParser("-"));
const zero = charParser("0");
const digitOneNine = anyOf(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
const digit = choice([zero, digitOneNine]);
const point = charParser(".");
const e = anyOf(["e", "E"]);
const optPlusMinus = opt(anyOf(["+", "-"]));

const nonZeroInt = toString(andThen(digitOneNine)(toString(many(digit))));
const intPart = orElse(nonZeroInt)(zero);
const fractionPart = toString(andThen(point)(toString(some(digit))));
const exponentPart = chain([e, optPlusMinus, toString(some(digit))]);
const numberParser = addLabel("number")(
  mapResult((result) => Number(result))(
    chain([optSign, intPart, opt(fractionPart), opt(exponentPart)])
  )
);

const ignoreTrailingSpaces = <T>(parser: Parser<T>) =>
  andThenLeft(parser)(whitespaceParser);

const jsonChar = (character: string) =>
  ignoreTrailingSpaces(charParser(character));

const arrayStart = jsonChar("[");
const arrayEnd = jsonChar("]");
const arraySep = jsonChar(",");

const arrayValues = <T>(valueParser: Parser<T>) =>
  sepBy(arraySep)(ignoreTrailingSpaces(valueParser));

const arrayParser = <A>(valueParser: Parser<A>) =>
  addLabel("array")(between(arrayStart)(arrayEnd)(arrayValues(valueParser)));

const objectStart = jsonChar("{");
const objectEnd = jsonChar("}");
const objectPairSep = jsonChar(",");
const objectKeyValSep = jsonChar(":");
const objectKey = ignoreTrailingSpaces(quotedStringParser);
const objectKeyValue = (valueParser: Parser<JSONValue>) =>
  mapResult(([key, value]: [string, JSONValue]) => ({ [key]: value }))(
    andThen(andThenLeft(objectKey)(objectKeyValSep))(
      ignoreTrailingSpaces(valueParser)
    )
  );

const objectParser = (valueParser: Parser<JSONValue>) =>
  mapResult(
    reduceWithStart((result: JSONObject) => (current: JSONObject) => ({
      ...result,
      ...current,
    }))({} as JSONObject)
  )(
    between(objectStart)(objectEnd)(
      sepBy(objectPairSep)(objectKeyValue(valueParser))
    )
  );

const valueParser = Y<InputStream, ParseResult<JSONValue>>((f) =>
  choice([
    nullParser,
    boolParser,
    quotedStringParser,
    numberParser,
    arrayParser(f),
    objectParser(f),
  ] as Parser<JSONValue>[])
);

export const parseJSON = parse(andThenRight(whitespaceParser)(valueParser));

// Get function
const pathCharParser = toString(some(satisfy((c) => c !== ".")));
const split = sepBy(charParser("."))(pathCharParser);

const ensure = <A>(result: ParseResult<A>) => (defaultValue: A) =>
  isParseError(result) ? defaultValue : result.value;

const splitPath = (path: string): string[] =>
  ensure(split(toInputStream(path)))([] as string[]);

export const get = (data: JSONValue) => (path: string) =>
  reduceWithStart((previous: JSONValue) => (current: string) => previous)(data)(
  splitPath(path))
//reduceWithStart((previous: JSONValue)=> (current: string) => previous && previous[current] )(data)(

