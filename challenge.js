const data = `
{
  "name": "Functional programming challenge",
  "goal": [
    "create a function that takes one argument
that is a path into this JSON struct",
    "get(\\"using.disallowed.0\\") should result in \\"No dependencies\\""
  ],
  "using": {
    "allowed": [
      "Only code in this file",
      "Only functions that take one argument",
      "Usage of && and ||",
      ".map(), .reduce()",
      "Provided head and tail functions",
      "Recursion"
    ],
    "disallowed": [
      "No dependencies",
      "No JSON.parse",
      "Usage of 'if' and ? : (ternary operator)",
      "Usage for/while loops",
      "No other host language functions except map and reduce",
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
    "full-json": 10
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

const satisfy = predicate => ([head, ...tail]) =>
  (predicate(head) && [head, tail]) || [
    FAILED,
    "Error parsing:",
    (head && `Unexpected '${head}'`) || "Unexpected EOF"
  ];

const onSuccess = result => next =>
  (result[PARSED] !== FAILED && next(result)) || result;
const onFailure = result => next =>
  (result[PARSED] === FAILED && next(result)) || result;

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

const choice = parsers =>
  parsers.reduce((result, elem) => orElse(result)(elem));

const chain = parsers =>
  parsers.reduce((result, elem) => andThen(result)(elem));

const stringToChars = ([head, ...tail]) =>
  (head && [head].concat(stringToChars(tail))) || [];
const anyOf = string => choice(stringToChars(string).map(characterParser));
const sequence = string => chain(stringToChars(string).map(characterParser));
const toList = mapResult(result => [result[0]].concat(result[1]));
const many = parser => stream =>
  orElse(toList(andThen(parser)(many(parser))))(returnResult([]))(stream);

const many1 = parser => toList(andThen(parser)(many(parser)));
const opt = parser => orElse(parser)(returnResult([]));

const andThenLeft = parserA => parserB =>
  mapResult(result => result[0])(andThen(parserA)(parserB));

const andThenRight = parserA => parserB =>
  mapResult(result => result[1])(andThen(parserA)(parserB));

const between = parserA => parserB => parserC =>
  andThenLeft(andThenRight(parserA)(parserB))(parserC);

const sepBy1 = parser => sepParser =>
  toList(andThen(parser)(many(andThenRight(sepParser)(parser))));

const sepBy = parser => sepParser =>
  orElse(sepBy1(parser)(sepParser))(returnResult([]));

const toString = mapResult(result =>
  result[0].concat(result[1]).reduce((str, char) => str + char)
);
const stringParser = string => addLabel(string)(toString(sequence(string)));

const toNumber = mapResult(([sign, digits]) =>
  Number([sign].concat(digits).reduce((str, char) => str + char))
);

const digits = "01234567890";
const integerParser = toNumber(
  andThen(opt(characterParser("-")))(many1(anyOf(digits)))
);

const whitespace = " \n\t";
const whitespaceParser = many1(anyOf(whitespace));

const nullParser = andThenRight(stringParser("null"))(returnResult(null));
const boolParser = addLabel("boolean")(
  orElse(andThenRight(stringParser("true"))(returnResult(true)))(
    andThenRight(stringParser("false"))(returnResult(false))
  )
);

const stringCharParser = satisfy(c => c !== '"' && c !== "\\");

console.log(stringCharParser("b"));
console.log(stringCharParser("\\"));

console.log(nullParser("null"));
console.log(nullParser("nul"));
console.log(boolParser("true"));
console.log(boolParser("tue"));
console.log(boolParser("false"));
