const data = `
{
  "name": "Functional programming challenge",
  "goal": [
    "create a function that takes one argument
that is a path into this JSON struct",
    "get(data)(\\"using.disallowed.0\\") should result in \\"No dependencies\\""
  ],
  "using": {
    "allowed": [
      "Only code in this file",
      "Only functions that take one argument",
      "Ternary operator true ? a : b",
      "Recursion"
    ],
    "disallowed": [
      "No dependencies",
      "No JSON.parse",
      "Usage of 'if'",
      "Usage of for/while loops",
      "No other host language functions",
      "Multiple statements in a lambda"
    ]
  },
  "hints": [
    "Think about function composition and currying",
    "Think about parser combinators",
    "https://fsharpforfunandprofit.com/posts/understanding-parser-combinators/"
  ],
  "points": {
    "started": 5,
    "full-json": 1e3
  },
  "jsonTypes": [null, true, false, 12]
}
`;

/**
 * So, not like this!
 * no function usage of the host language
 *
 * const ast = JSON.parse(data);
 * const get = path =>
 *   path.split(".").reduce((item, term) => item && item[term], ast);
 * console.log(get("using.disallowed.0"));
 *
 */

// Parser signagure: String => [Boolean, String]
const PARSED = 0;
const REMAINING = 1;
const FAILED = Symbol("Failed");

const map = transform => ([head, ...tail]) =>
  head ? [transform(head), ...map(transform)(tail)] : [];

const doReduce = reducer => start => ([head, ...tail]) =>
  head ? doReduce(reducer)(reducer(start)(head))(tail) : start;

const reduce = reducer => ([head, ...tail]) => doReduce(reducer)(head)(tail);

const concat = list1 => list2 => [...list1, ...list2];

const satisfy = predicate => ([head, ...tail]) =>
  head
    ? predicate(head)
      ? [head, tail]
      : [FAILED, "Error parsing:", `Unexpected '${head}'`]
    : [FAILED, "Error parsing:", "Unexpected EOF"];

const onSuccess = result => next =>
  result[PARSED] !== FAILED ? next(result) : result;
const onFailure = result => next =>
  result[PARSED] === FAILED ? next(result) : result;

const addLabel = label => parser => stream =>
  onFailure(parser(stream))(([failed, , error]) => [
    failed,
    `Error parsing '${label}':`,
    error
  ]);

const characterParser = character =>
  addLabel(character)(satisfy(c => c === character));

const combineResult = resultA => resultB =>
  onSuccess(resultB)(() => [
    [resultA[PARSED], resultB[PARSED]],
    resultB[REMAINING]
  ]);

const returnResult = returnValue => stream => [returnValue, stream];
const mapResult = transform => parser => stream =>
  onSuccess(parser(stream))(result => [
    transform(result[PARSED]),
    result[REMAINING]
  ]);

const andThen = parserA => parserB => stream =>
  onSuccess(parserA(stream))(result =>
    combineResult(result)(parserB(result[REMAINING]))
  );

const orElse = parserA => parserB => stream =>
  onFailure(parserA(stream))(() => parserB(stream));

const choice = reduce(orElse);
const chain = reduce(a => b => mapResult(([a, b]) => [...a, b])(andThen(a)(b)));

const stringToChars = ([head, ...tail]) =>
  head ? concat([head])(stringToChars(tail)) : [];
const anyOf = string => choice(map(characterParser)(stringToChars(string)));
const sequence = string => chain(map(characterParser)(stringToChars(string)));
const toList = mapResult(result => concat([result[0]])(result[1]));
const many = parser => stream =>
  orElse(toList(andThen(parser)(many(parser))))(returnResult([]))(stream);

const many1 = parser => toList(andThen(parser)(many(parser)));
const opt = parser => orElse(parser)(returnResult([]));

const andThenLeft = parserA => parserB =>
  mapResult(result => result[0])(andThen(parserA)(parserB));

const andThenRight = parserA => parserB =>
  mapResult(result => result[1])(andThen(parserA)(parserB));

const between = parserA => parserC => parserB =>
  andThenLeft(andThenRight(parserA)(parserB))(parserC);

const sepBy1 = sepParser => parser =>
  toList(andThen(parser)(many(andThenRight(sepParser)(parser))));

const sepBy = sepParser => parser =>
  orElse(sepBy1(sepParser)(parser))(returnResult([]));

const add = a => b => a + b;
const join = a => b => [...a, b];
const toString = mapResult(result => reduce(add)(result));
const stringParser = string => addLabel(string)(sequence(string));

const parseStringResult = string => result =>
  andThenRight(stringParser(string))(returnResult(result));

const nullParser = parseStringResult("null")(null);
const boolParser = addLabel("boolean")(
  orElse(parseStringResult("true")(true))(parseStringResult("false")(false))
);

const stringCharParser = satisfy(c => c !== '"' && c !== "\\");
const specialCharacters = [
  ['\\"', '"'],
  ["\\\\", "\\"],
  ["\\/", "/"],
  ["\\b", "\b"],
  ["\\f", "\f"],
  ["\\n", "\n"],
  ["\\r", "\r"],
  ["\\t", "\t"]
];
const escapedCharParser = choice(
  map(([match, result]) => parseStringResult(match)(result))(specialCharacters)
);

const quoteParser = characterParser('"');
const quotedStringParser = addLabel("string")(
  toString(
    between(quoteParser)(quoteParser)(
      many(orElse(stringCharParser)(escapedCharParser))
    )
  )
);

const forwardReference = (impl = () => [FAILED, "Unforfilled"]) => [
  stream => impl(stream),
  update => (impl = update)
];

const [valueParser, updateValueParserRef] = forwardReference();

const whitespace = " \n\t";
const whitespaceParser = many(anyOf(whitespace));

const optSign = opt(characterParser("-"));
const zero = stringParser("0");
const digitOneNine = anyOf("123456789");
const digit = anyOf("0123456789");
const point = characterParser(".");
const e = anyOf("eE");
const optPlusMinus = opt(anyOf("+-"));

const nonZeroInt = toString(andThen(digitOneNine)(toString(many(digit))));
const intPart = orElse(nonZeroInt)(zero);
const fractionPart = toString(andThen(point)(toString(many1(digit))));
const exponentPart = toString(chain([e, optPlusMinus, toString(many1(digit))]));
const numberParser = addLabel("number")(
  mapResult(result => Number(result))(
    toString(chain([optSign, intPart, opt(fractionPart), opt(exponentPart)]))
  )
);

const ignoreTrailingSpaces = parser => andThenLeft(parser)(whitespaceParser);
const arrayStart = ignoreTrailingSpaces(characterParser("["));
const arrayEnd = ignoreTrailingSpaces(characterParser("]"));
const arraySep = ignoreTrailingSpaces(characterParser(","));
const arrayValue = ignoreTrailingSpaces(valueParser);
const arrayValues = sepBy(arraySep)(arrayValue);
const arrayParser = addLabel("array")(
  between(arrayStart)(arrayEnd)(arrayValues)
);

const objectStart = ignoreTrailingSpaces(characterParser("{"));
const objectEnd = ignoreTrailingSpaces(characterParser("}"));
const objectPairSep = ignoreTrailingSpaces(characterParser(","));
const objectKeyValSep = ignoreTrailingSpaces(characterParser(":"));
const objectKey = ignoreTrailingSpaces(quotedStringParser);
const objectValue = ignoreTrailingSpaces(valueParser);
const objectKeyValue = andThen(andThenLeft(objectKey)(objectKeyValSep))(
  objectValue
);
const objectParser = mapResult(
  doReduce(result => ([key, value]) => ({ ...result, [key]: value }))({})
)(between(objectStart)(objectEnd)(sepBy(objectPairSep)(objectKeyValue)));

updateValueParserRef(
  choice([
    nullParser,
    boolParser,
    numberParser,
    quotedStringParser,
    arrayParser,
    objectParser
  ])
);

const jsonParser = stream =>
  onSuccess(andThenRight(whitespaceParser)(valueParser)(stream))(
    ([result, remaining]) =>
      remaining.length > 0
        ? [FAILED, "Unexpected characters:", remaining]
        : result
  );

const pathCharParser = toString(many1(satisfy(c => c !== ".")));
const split = sepBy(characterParser("."))(pathCharParser);

const get = data => path =>
  doReduce(result => item => result && result[item])(data)(split(path)[0]);

const jsonStruct = jsonParser(data);

console.log(get(jsonStruct)("using.disallowed.0"));
