# Parsing strings and numbers

This is a continuation of the Functional Programming challenge I gave myself:
Write a JSON parser in JavaScript, using
[the parser combinator principles from the blogpost of Scott Wlaschin](https://fsharpforfunandprofit.com/posts/understanding-parser-combinators/).

So far we defined the challenge, added some rules to adhere, created a character
parser and we are able to parse the first literals of JSON: `null`, `true` and
`false`.

## Quoted string parser

Its time for the next type to parse: _Strings_.

A String according to the JSON spec is defined as follows:

```ebnf
string = '"',
  { ? Any unicode character except " or \ or control character ?
  | "\", (
    '"' | "\" | "/" | "b" | "f" | "n" | "r" | "t" |
    "u", 4 * ? hexadeximal digit ?
  ) }, '"';
```

Since our example data does not have `\uXXXX` unicode in it, I will skip the
implementation of it.

Let us start with parsing the quote:

```javascript
const quoteParser = characterParser('"');
console.log(quoteParser('"test"')); // [ '"', [ 't', 'e', 's', 't', '"' ] ]
```

The string could contain any character, so having to define them all using the
`characterParser` would be madness. Time to change the strategy here, by
changing the `characterParser` into a `satisfy` method, that parses / consumes
the head of our stream when it satisfies a predicate.

### What is a predicate?

A Predicate is a function that will simply return `true` or `false` based on the
input. It is commonly used in `[].filter()`, `[].some()` and `[].every()`.

```javascript
const parseError = message => error => [FAILED, message, error];
const genericParseError = parseError("Error parsing:");

const satisfy = predicate => ([head, ...tail]) =>
  head
    ? predicate(head)
      ? [head, tail]
      : genericParseError(`Unexpected '${head}'`)
    : genericParseError("Unexpected EOF");

const addLabel = label => parser => stream =>
  onFailure(parser(stream))(([, , error]) =>
    parseError(`Error parsing '${label}':`)(error)
  );

const characterParser = character =>
  addLabel(character)(satisfy(c => c === character));
```

Since we now use a predicate that needs to return a `true` or `false` to
determine if the `head` of the data must be consumed, it is no longer possible
to say which character we were trying to parse. I updated the error message
therefor to a real generic one: "Error parsing:".

After adjusting the `addLabel` as well, the `characterParser` would still stay
compatible. And now we can create a new parser. The `stringCharParser` that
would 'satisfy' on each character except the double quote `"`.

```javascript
const stringCharParser = satisfy(c => c !== '"');

const quotedStringParser = andThenRight(quoteParser)(stringCharParser);

console.log(quotedStringParser('"test"')); // [ 't', [ 'e', 's', 't', '"' ] ]
console.log(quotedStringParser('""')); // [ Symbol(Failed), 'Error parsing:', `Unexpected '"'` ]
```

We could repeat a parser until it fails, to parse all the characters in the
string. If it fails, we will return an empty result, to allow empty strings, and
create the repeat process using recursion:

```javascript
const many = parser => stream =>
  orElse(andThen(parser)(many(parser)))(resultParser([]))(stream);
```

The parser will try to apply itself, and on success call itself to try the next
character. We are breaking one of the rules of the challenge now: _Recursion to
own function_. For now, I just want to focus on completing the JSON parser, so I
will park this challenge for later.

We are able to parse the whole (test) string now:

```javascript
const quotedStringParser = andThenRight(quoteParser)(many(stringCharParser));

console.log(quotedStringParser('"test"')); // [ [ 't', [ 'e', [Array] ] ], [ '"' ] ]
```

now only parsing the right quote, by adding a `andThenLeft` parser:

```javascript
const andThenLeft = parserA => parserB =>
  mapResult(result => result[0])(andThen(parserA)(parserB));

const quotedStringParser = andThenLeft(
  andThenRight(quoteParser)(many(stringCharParser))
)(quoteParser);

console.log(quotedStringParser('"test"')); // [ [ 't', [ 'e', [Array] ] ], [] ]
```

The whole string is parsed, but the result is not a nice string as hoped. It has
a nesting structure, caused by the `andThen` construct.

```javascript
["t", ["e", ["s", "t"]]];
```

Lets change that, using the earlier built `mapResult`:

```javascript
const toList = mapResult(result => [result[0]].concat(result[1]));
```

And now wrap it around the `andThen` call in the `many` parser, to keep
flattening the result:

```javascript
const many = parser => stream =>
  orElse(toList(andThen(parser)(many(parser))))(resultParser([]))(stream);

console.log(quotedStringParser('"test"')); // [ [ 't', 'e', 's', 't' ], [] ]
```

Much better! Now add another `mapResult` in the `quotedStringParser` to join all
the characters:

```javascript
const toString = mapResult(result => result.join(""));

const quotedStringParser = andThenLeft(
  andThenRight(quoteParser)(toString(many(stringCharParser)))
)(quoteParser);

console.log(quotedStringParser('"test"')); // [ 'test', [ ] ]
console.log(quotedStringParser('""')); // [ '', [ ] ]
```

Simple strings can now be parsed, time for some refactoring:

```javascript
const between = parserLeft => parserMiddle => parserRight =>
  andThenLeft(andThenRight(parserLeft)(parserMiddle))(parserRight);

const quotedStringParser = between(quoteParser)(
  toString(many(stringCharParser))
)(quoteParser);
```

The currying of `between` seems logical, because it semantically looks like a
string parser between quote parsers. But I found out it is more logical to have
the argument that could change the most to be at the end. This way you can
profit the most from "partially applied functions".

```javascript
const between = parserLeft => parserRight => parserMiddle =>
  andThenLeft(andThenRight(parserLeft)(parserMiddle))(parserRight);

const quotedStringParser = between(quoteParser)(quoteParser)(
  toString(many(stringCharParser))
);
```

Lets say we would also like to create a quoted boolean parser, we could do it
more easily when the middle section would be its last argument:

```javascript
const quotedParser = between(quoteParser)(quoteParser);

const quotedStringParser = quotedParser(toString(many(stringCharParser)));
const quotedBooleanParser = quotedParser(boolParser);
```

Lets continue with the escape characters of our string:

```javascript
console.log(quotedStringParser('"test\\nmultiple \\"lines\\""'));
// [ 'test\\nmultiple \\', [ 'l', 'i', 'n', 'e', 's', '\\', '"', '"' ] ]
```

We could start by listing all special characters we have, and what result they
should produce. Then create a `choice` parser, that is a `orElse` for a list of
parsers. (Just like `chain` is for the `andThen`)

```javascript
const quoteParser = characterParser('"');
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
const choice = parsers => parsers.reduce((a, b) => orElse(a)(b));
const escapedCharParser = choice(
  specialCharacters.map(([match, result]) => parseStringResult(match)(result))
);

const quotedStringParser = between(quoteParser)(quoteParser)(
  toString(many(orElse(stringCharParser)(escapedCharParser)))
);
console.log(quotedStringParser('"test\\nmultiple \\"lines\\""'));
// [ 'test\nmultiple "lines"', [] ]
```

So the string was in there as well now. I really like how the `chain` and
`choice` are alike:

```javascript
const chain = parsers => parsers.reduce((a, b) => andThen(a)(b));
const choice = parsers => parsers.reduce((a, b) => orElse(a)(b));
```

What I did not like however, was that the function passed into the `.reduce` had
to accept 2 parameters. Time to force us into another direction, by adding yet
another selector to our `no-restricted-syntax` eslint rule, in our
`package.json`:

```json
{
  "eslintConfig": {
    "rules": {
      "no-restricted-syntax": [
        "error",
        {
          "selector": "ArrowFunctionExpression[params.length > 1]",
          "message": "Only 1 argument allowed. Please use currying"
        }
      ]
    }
  }
}
```

The following lines are now giving errors:

```javascript
const chain = parsers => parsers.reduce((a, b) => andThen(a)(b));
const choice = parsers => parsers.reduce((a, b) => orElse(a)(b));
```

So we build our own, recursive reducer:

```javascript
const doReduce = reducer => start => ([head, ...tail]) =>
  head ? doReduce(reducer)(reducer(start)(head))(tail) : start;

const reduce = reducer => ([head, ...tail]) => doReduce(reducer)(head)(tail);

console.log(doReduce(a => b => a + b)(1)([2, 3, 4])); // 10
console.log(reduce(a => b => a + b)([1, 2, 3, 4])); // 10
```

The `doReduce` function will accept a reducer, a start value and a list. The
reducer should have the signature `acc => elem => {}`. The `reduce` function is
a convenient method to use the first value of the list as initial accumulated
value.

Having our new reducer function, we are now actually able to write:

```javascript
const chain = list => reduce(a => b => andThen(a)(b))(list);
const choice = list => reduce(a => b => orElse(a)(b))(list);
```

Which is actually the same as:

```javascript
const chain = reduce(andThen);
const choice = reduce(orElse);
```

🤯

## The Number parser

Number in JSON have a extensive format:

```ebnf
number = [ "-" ],
  ( "0" | ? digit 1-9 ?, { ? digit ? } ),
  [ ".", ? digit ?, { ? digit ? } ],
  [ ( "e" | "E" ), [ "+" | "-" ], ? digit ?, { ? digit ? } ];
```

Lets idenfity the elements:

- An optional sign "-"
- An integer part
- An optional fractional part
- An optional exponent part

A number has a lot of optional parts, and a lot of 'choices' within them.

Time to introduce new parser tools for them:

- AnyOf. Each character in the string is becoming an allowed character. This
  will help us define 'digits'
- Opt. If parsing fails, succeed anyway. (Thus making the first parse optional)

```javascript
const anyOf = string => choice([...string].map(characterParser));
const opt = parser => orElse(parser)(resultParser([]));
```

We can now create the sign parser:

```javascript
const optSign = opt(characterParser("-"));
```

And the integer parser:

```javascript
const zero = characterParser("0");
const digitOneNine = anyOf("123456789");
const digit = anyOf("0123456789");

const nonZeroInt = toString(andThen(digitOneNine)(toString(many(digit))));
const intPart = orElse(nonZeroInt)(zero);
```

We use the toString to concat the results together. And we will use `chain` to
add our individual pieces into a single parser:

```javascript
const numberParser = chain([optSign, intPart]);

console.log(numberParser("-123.45e6"));
// [ [ '-', '123' ], [ '.', '4', '5', 'e', '6' ] ]

console.log(numberParser("123.45e-6"));
// [ [ [], '123' ], [ '.', '4', '5', 'e', '-', '6' ] ]
```

Now the fraction part:

```javascript
const some = parser => toList(andThen(parser)(many(parser)));
const point = characterParser(".");
const fractionPart = toString(andThen(point)(toString(some(digit))));
const numberParser = chain([optSign, intPart, opt(fractionPart)]);

console.log(numberParser("-123.45e6"));
// [ [ [ '-', '123' ], '.45' ], [ 'e', '6' ] ]

console.log(numberParser("123.45e-6"));
// [ [ [ [], '123' ], '.45' ], [ 'e', '-', '6' ] ]
```

Now only the exponent part:

```javascript
const e = anyOf("eE");
const optPlusMinus = opt(anyOf("+-"));
const exponentPart = toString(chain([e, optPlusMinus, toString(some(digit))]));

const numberParser = chain([
  optSign,
  intPart,
  opt(fractionPart),
  opt(exponentPart)
]);

console.log(numberParser("-123.45e6"));
// [ [ [ [Array], '.45' ], 'e,6' ], [] ]

console.log(numberParser("123.45e-6"));
// [ [ [ [Array], '.45' ], 'e,-6' ], [] ]
```

The exponent part is not quite what we expected. It has returned `e,6` instead
of `e6`. This has to do with the `toString` over the `chain` function. The rest
of the result is also acting like a russion doll. We need to flatten te result
during the chain process, to prevent the nested `andThen` constructs to produce
this nested result.

```javascript
const chain = reduce(parserA => parserB =>
  mapResult(([resultA, resultB]) => [...resultA, resultB])(
    andThen(parserA)(parserB)
  )
);

console.log(numberParser("-123.45e6"));
// [ [ '-', '123', '.45', 'e6' ], [] ]

console.log(numberParser("123.45e-6"));
// [ [ '123', '.45', 'e-6' ], [] ]
```

Much better! now we should convert it to an actual JavaScript number. To make it
easy for use, we will use the `Number()` to typecast our parsed string to a
number. The final number parser now looks like this:

```javascript
const numberParser = addLabel("number")(
  mapResult(result => Number(result))(
    toString(chain([optSign, intPart, opt(fractionPart), opt(exponentPart)]))
  )
);

console.log(numberParser("-123.45e6"));
// [ -123450000, [] ]

console.log(numberParser("123.45e-6"));
// [ 0.00012345, [] ]
```

This is one seemed quite easy to build, even if a number has a lot of seperate
parts.

The implementation so far:

```javascript
const FAILED = Symbol("Failed");
const PARSED = 0;
const REMAINING = 1;

const parseError = message => error => [FAILED, message, error];
const genericParseError = parseError("Error parsing:");

const satisfy = predicate => ([head, ...tail]) =>
  head
    ? predicate(head)
      ? [head, tail]
      : genericParseError(`Unexpected '${head}'`)
    : genericParseError("Unexpected EOF");

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

const andThen = parserA => parserB => stream =>
  onSuccess(parserA(stream))(result =>
    combineResult(result)(parserB(result[REMAINING]))
  );

const orElse = parserA => parserB => stream =>
  onFailure(parserA(stream))(() => parserB(stream));

const resultParser = result => stream => [result, stream];

const mapResult = transform => parser => stream =>
  onSuccess(parser(stream))(result => [
    transform(result[PARSED]),
    result[REMAINING]
  ]);

const andThenLeft = parserA => parserB =>
  mapResult(result => result[0])(andThen(parserA)(parserB));

const andThenRight = parserA => parserB =>
  mapResult(result => result[1])(andThen(parserA)(parserB));

const between = parserLeft => parserRight => parserMiddle =>
  andThenLeft(andThenRight(parserLeft)(parserMiddle))(parserRight);

const doReduce = reducer => start => ([head, ...tail]) =>
  head ? doReduce(reducer)(reducer(start)(head))(tail) : start;
const reduce = reducer => ([head, ...tail]) => doReduce(reducer)(head)(tail);

const chain = reduce(parserA => parserB =>
  mapResult(([resultA, resultB]) => [...resultA, resultB])(
    andThen(parserA)(parserB)
  )
);
const choice = reduce(orElse);

const toList = mapResult(result => [result[0]].concat(result[1]));
const toString = mapResult(result => result.join(""));

const many = parser => stream =>
  orElse(toList(andThen(parser)(many(parser))))(resultParser([]))(stream);

const stringParser = string =>
  addLabel(string)(chain([...string].map(char => characterParser(char))));

const parseStringResult = string => result =>
  andThenRight(stringParser(string))(resultParser(result));

const nullParser = parseStringResult("null")(null);
const boolParser = orElse(parseStringResult("true")(true))(
  parseStringResult("false")(false)
);

const quoteParser = characterParser('"');
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
  specialCharacters.map(([match, result]) => parseStringResult(match)(result))
);

const quotedStringParser = addLabel("string")(
  between(quoteParser)(quoteParser)(
    toString(many(orElse(stringCharParser)(escapedCharParser)))
  )
);

const anyOf = string => choice([...string].map(characterParser));
const opt = parser => orElse(parser)(resultParser([]));
const some = parser => toList(andThen(parser)(many(parser)));
const optSign = opt(characterParser("-"));

const digitOneNine = anyOf("123456789");
const digit = anyOf("0123456789");

const point = characterParser(".");
const optPlusMinus = opt(anyOf("+-"));
const e = anyOf("eE");

const zero = characterParser("0");
const nonZeroInt = toString(andThen(digitOneNine)(toString(many(digit))));
const intPart = orElse(nonZeroInt)(zero);
const fractionPart = toString(andThen(point)(toString(some(digit))));
const exponentPart = toString(chain([e, optPlusMinus, toString(some(digit))]));

const numberParser = addLabel("number")(
  mapResult(result => Number(result))(
    toString(chain([optSign, intPart, opt(fractionPart), opt(exponentPart)]))
  )
);
```

## Conclusion

The code so far:

- We changed our basic `characterParser` to a more generic `satisfy` function,
  and build a new `characterParser` upon that.
- We added more tools to the parsing family:
  - `some` (one or more)
  - `many` (zero or more)
  - `opt` (zero or one)
  - `anyOf` (choice of character parsers)
- We can now parse all 'simple' types in JSON. `null`, `true`, `false`, `string`
  and `number`.
- We refactored reduce into a curried function
- Our parsers now produce a result based on the dynamic input, and of the proper
  type.

What I learned so far:

- Changing earlier basic functions around is quite easy
- We are mainly building 'tools' to make a parser, instead of building the
  actual parser. The JSON specific part is still really small.

What did I like:

- When building it you really feel a gain in speed. We are working with bigger
  and bigger parts. It feels like ages when we first started with parsing a
  single character
- The structure of the JSON part implementation is quite on-par with the EBNF
  definition
- Changing the reduce into a curried version was really nice. If actually
  benefitted readability when being able to write: `reduce(orElse)`
- It starts to feel more and more normal to only have a single argument for a
  function

What did I not like:

- We should also update the `.map` and `.join` to curried versions

Next time:

- Enforcing the single argument rule
- Parsing arrays of values and objects
