# Parsing strings and numbers

This is a continuation of the Functional Programming challenge I gave myself:
Write a JSON parser in JavaScript, using
[the parser combinator principles from the blogpost of Scott Wlaschin](https://fsharpforfunandprofit.com/posts/understanding-parser-combinators/).

So far we defined the challenge, added some rules to adhere, created a character
parser and we are able to parse the first literals of JSON: `null`, `true` and
`false`.

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
`characterParser` would be madness. Time to change the strategy here:

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
own function_. The reasoning is, the function now has a strict reference to
itself.

For now, I just want to focus on completing the JSON parser, so I will park this
issue for later.

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

Before we start on the escape characters of our string, here is the complete
implementation up till now. I moved the order of the implementation around, to
have the more generic functions at the top, and the more JSON specific functions
at the bottom.

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

const chain = parsers => parsers.reduce((a, b) => andThen(a)(b));

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
const stringCharParser = satisfy(c => c !== '"');

const quotedStringParser = between(quoteParser)(quoteParser)(
  toString(many(stringCharParser))
);

console.log(nullParser("null")); // [ null, [] ]
console.log(boolParser("true")); // [ true, [] ]
console.log(boolParser("false")); // [ false, [] ]
console.log(quotedStringParser('"test"')); // [ 'test', [] ]
console.log(quotedStringParser('""')); // [ '', [] ]
```
