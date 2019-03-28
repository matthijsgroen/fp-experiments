const data = `
{
  "name": "Functional programming challenge",
  "goal": [
    "create a function that takes one argument that is a path into this JSON struct",
    "get(data)(\\"using.disallowed.0\\") should result in \\"No dependencies\\"",
    "get(data)(\\"points.full-json.\\") should result in 1000",
    "get(data)(\\"jsonTypes.2\\") should result in false"
  ],
  "using": {
    "allowed": [
      "Only code in this file",
      "Only functions that take one argument",
      "Ternary operator true ? a : b"
    ],
    "disallowed": [
      "No dependencies",
      "Recursion to own function",
      "No JSON.parse",
      "Usage of 'if'",
      "Usage of for/while loops",
      "No host object functions (.split, .map, .reduce, etc)",
      "Multiple statements in a lambda"
    ]
  },
  "hints": [
    "Think about function composition and currying",
    "Think about parser combinators",
    "https://fsharpforfunandprofit.com/posts/understanding-parser-combinators/"
  ],
  "points": {
    "not-trying": 0,
    "started": 5,
    "full-json": 1e3,
    "without-recursion": 1e4
  },
  "jsonTypes": [null, true, false, -0.12]
}
`;

/**
 * So, not like this!
 * no function usage of the host language
 *
 * const ast = JSON.parse(data);
 * const get = ast => path =>
 *   path.split(".").reduce((item, term) => item && item[term], ast);
 * console.log(get(ast)("using.disallowed.0"));
 *
 */

// helper utilities

const Y = f => (x => x(x))(x => f(y => x(x)(y)));

const applyMap = transform => f => ([head, ...tail]) =>
  head ? [transform(head), ...f(tail)] : [];

const map = transform => Y(applyMap(transform));

const applyReduce = reducer => f => start => ([head, ...tail]) =>
  head ? f(reducer(start)(head))(tail) : start;

const reduce = reducer => ([head, ...tail]) =>
  Y(applyReduce(reducer))(head)(tail);

const reduceWithStart = reducer => head => Y(applyReduce(reducer))(head);

const concat = list1 => list2 => [...list1, ...list2];

// Parser signagure:
// String => [result: any, remaining: string] | [FAILED, errorType: string, conflict: string]
const PARSED = 0;
const REMAINING = 1;
const FAILED = Symbol("Failed");

const parseError = target => error => [
  FAILED,
  `Error parsing: '${target}'`,
  error
];

// ~300ms
//const head = stream => stream[0];
//const tail = ([, ...tail]) => tail;

/// ~40ms
//const toStream = textData => [0, textData];
//const head = ([pos, textData]) => textData[pos];
//const tail = ([pos, textData]) => [pos + 1, textData];

const satisfy = predicate => ([head, ...tail]) =>
  head
    ? predicate(head)
      ? [head, tail]
      : parseError("Error parsing:")(`Unexpected '${head}'`)
    : parseError("Error parsing:")("Unexpected EOF");

const onSuccess = result => next =>
  result[PARSED] !== FAILED ? next(result) : result;
const onFailure = result => next =>
  result[PARSED] === FAILED ? next(result) : result;

const addLabel = label => parser => stream =>
  onFailure(parser(stream))(([, , error]) =>
    parseError(`Error parsing '${label}':`)(error)
  );

const characterParser = character =>
  addLabel(character)(satisfy(c => c === character));

const combineResult = resultA => resultB =>
  onSuccess(resultB)(() => [
    [resultA[PARSED], resultB[PARSED]],
    resultB[REMAINING]
  ]);

const resultParser = result => stream => [result, stream];
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
const chain = reduce(parserA => parserB =>
  mapResult(([resultA, resultB]) => [...resultA, resultB])(
    andThen(parserA)(parserB)
  )
);

const anyOf = string => choice(map(characterParser)([...string]));
const sequence = string => chain(map(characterParser)([...string]));
const toList = mapResult(result => concat([result[0]])(result[1]));

const applyMany = parser => f => stream =>
  orElse(toList(andThen(parser)(f)))(resultParser([]))(stream);
const many = parser => Y(applyMany(parser));

const some = parser => toList(andThen(parser)(many(parser)));
const opt = parser => orElse(parser)(resultParser([]));

const andThenLeft = parserA => parserB =>
  mapResult(result => result[0])(andThen(parserA)(parserB));

const andThenRight = parserA => parserB =>
  mapResult(result => result[1])(andThen(parserA)(parserB));

const between = parserA => parserC => parserB =>
  andThenLeft(andThenRight(parserA)(parserB))(parserC);

const sepBy1 = sepParser => parser =>
  toList(andThen(parser)(many(andThenRight(sepParser)(parser))));

const sepBy = sepParser => parser =>
  orElse(sepBy1(sepParser)(parser))(resultParser([]));

const join = a => b => String(a) + String(b);
const toString = mapResult(reduce(join));
const stringParser = string => addLabel(string)(sequence(string));

const parseStringResult = string => result =>
  andThenRight(stringParser(string))(resultParser(result));

// Building the parser

const whitespaceParser = many(anyOf(" \n\t"));
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

const optSign = opt(characterParser("-"));
const zero = characterParser("0");
const digitOneNine = anyOf("123456789");
const digit = anyOf("0123456789");
const point = characterParser(".");
const e = anyOf("eE");
const optPlusMinus = opt(anyOf("+-"));

const nonZeroInt = toString(andThen(digitOneNine)(toString(many(digit))));
const intPart = orElse(nonZeroInt)(zero);
const fractionPart = toString(andThen(point)(toString(some(digit))));
const exponentPart = toString(chain([e, optPlusMinus, toString(some(digit))]));
const numberParser = addLabel("number")(
  mapResult(result => Number(result))(
    toString(chain([optSign, intPart, opt(fractionPart), opt(exponentPart)]))
  )
);

const ignoreTrailingSpaces = parser => andThenLeft(parser)(whitespaceParser);
const jsonChar = character => ignoreTrailingSpaces(characterParser(character));
const arrayStart = jsonChar("[");
const arrayEnd = jsonChar("]");
const arraySep = jsonChar(",");
const arrayValues = valueParser =>
  sepBy(arraySep)(ignoreTrailingSpaces(valueParser));
const arrayParser = valueParser =>
  addLabel("array")(between(arrayStart)(arrayEnd)(arrayValues(valueParser)));

const objectStart = jsonChar("{");
const objectEnd = jsonChar("}");
const objectPairSep = jsonChar(",");
const objectKeyValSep = jsonChar(":");
const objectKey = ignoreTrailingSpaces(quotedStringParser);
const objectKeyValue = valueParser =>
  andThen(andThenLeft(objectKey)(objectKeyValSep))(
    ignoreTrailingSpaces(valueParser)
  );
const objectParser = valueParser =>
  mapResult(
    reduceWithStart(result => ([key, value]) => ({ ...result, [key]: value }))(
      {}
    )
  )(
    between(objectStart)(objectEnd)(
      sepBy(objectPairSep)(objectKeyValue(valueParser))
    )
  );

const applyValueParser = valueParser =>
  choice([
    nullParser,
    boolParser,
    numberParser,
    quotedStringParser,
    arrayParser(valueParser),
    objectParser(valueParser)
  ]);

const valueParser = Y(applyValueParser);

const jsonParser = stream =>
  onSuccess(andThenRight(whitespaceParser)(valueParser)(stream))(
    ([result, remaining]) =>
      remaining.length > 0
        ? [FAILED, "Unexpected characters:", remaining]
        : result
  );

// Get function

const pathCharParser = toString(some(satisfy(c => c !== ".")));
const split = sepBy(characterParser("."))(pathCharParser);

const get = data => path =>
  reduceWithStart(result => item => result && result[item])(data)(
    split(path)[0]
  );

const jsonStruct = jsonParser(data);
console.log(get(jsonStruct)("using.disallowed.0"));
console.log(get(jsonStruct)("points.full-json"));
console.log(get(jsonStruct)("jsonTypes.2"));

/* -- for performance indication
const startTime = new Date() * 1;
const jsonData = `[${data}, ${data}, ${data}, ${data}, ${data}]`;
console.log(jsonData.length);
const jsonStruct = jsonParser(jsonData);
const endTime = new Date() * 1;

console.log(get(jsonStruct)("0.using.disallowed.0"));
console.log(get(jsonStruct)("0.points.full-json"));
console.log(get(jsonStruct)("0.jsonTypes.2"));

console.log("Duration", endTime - startTime);
*/
