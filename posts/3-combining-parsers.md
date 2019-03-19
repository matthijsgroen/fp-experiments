# Combining parsers

At this point, we are able to parse a single character from a string or array of
characters. We have applied a lot of eslint rules to force us to take a more and
more functional approach. In this post, we will start combining the parsers to
create more semantical constructions.

Since I have added a 'single statement' rule, my implementation will start to
deviate from the one in
[the parser combinators blogpost](https://fsharpforfunandprofit.com/posts/understanding-parser-combinators/).
For more background of parser combinators, please checkout this great post by
Scott Wlaschin.

We established a signature for our parser:

```typescript
type stream = string[];
type success = [any, stream];
type failure = [Symbol, string, string];
type parser = (stream: stream) => success | failure;
```

## andThen parser

To actually parse more than one character, we want to create structure how the
parser should continue when succesful or when it fails, by creating 2 more
parsers:

- andThen (to chain a parser after a succesful first parser)
- orElse (to try an alternative parser after a failed attempt of the first
  parser)

```javascript
const FAILED = Symbol("Failed");
const PARSED = 0;
const REMAINING = 1;

const parseError = target => error => [
  FAILED,
  `Error parsing: '${target}'`,
  error
];

const characterParser = character => ([head, ...tail]) =>
  head
    ? head === character
      ? [head, tail]
      : parseError(character)(`Unexpected '${head}'`)
    : parseError(character)("Unexpected EOF");

const aParser = characterParser("a"); // see 'first-parser' post
const bParser = characterParser("b");

const andThen = parserA => parserB => stream => "???";

const abParser = andThen(aParser)(bParser);
console.log(abParser("abcd")); // "???"
```

We ar now just testing out the signature. We want to use 2 parsers, and that
would produce a new parser that accepts the stream.

Just starting on running parserA:

```javascript
const andThen = parserA => parserB => stream => parserA(stream);

const abParser = andThen(aParser)(bParser);
console.log(abParser("abcd")); // ["a", ["b", "c", "d"]]
console.log(abParser("iabcd")); // [ Symbol(Failed), "Error parsing 'a':", "Unexpected 'i'" ]
console.log(abParser("aibcd")); // ["a", ["i", "b", "c", "d"]]
```

Now we need to chain parserB to it if successful:

```javascript
const PARSED = 0;
const onSuccess = result => next =>
  result[PARSED] !== FAILED ? next(result) : result;
```

Using this function, I can determine if we had a success. If it is successful,
the parser will execute the next step, providing the result.

And now in action:

```javascript
const REMAINING = 1;
const andThen = parserA => parserB => stream =>
  onSuccess(parserA(stream))(result => parserB(result[REMAINING]));

const abParser = andThen(aParser)(bParser);
console.log(abParser("abcd")); // [ 'b', [ 'c', 'd' ] ]
console.log(abParser("iabcd")); // [ Symbol(Failed), "Error parsing 'a':", "Unexpected 'i'" ]
console.log(abParser("aibcd")); // [ Symbol(Failed), "Error parsing 'b':", "Unexpected 'i'" ]
```

Ok the last 2 lines are as expected now. but the first one is incorrect. the
result of the parse should not be `'b'`, but `['a', 'b']`.

We need to combine the result from parser A with parser B:

```javascript
const combineResult = resultA => resultB =>
  onSuccess(resultB)(() => [
    [resultA[PARSED], resultB[PARSED]],
    resultB[REMAINING]
  ]);

const andThen = parserA => parserB => stream =>
  onSuccess(parserA(stream))(result =>
    combineResult(result)(parserB(result[REMAINING]))
  );

console.log(abParser("abcd")); // [ [ 'a', 'b' ], [ 'c', 'd' ] ]
console.log(abParser("iabcd")); // [ Symbol(Failed), "Error parsing 'a':", "Unexpected 'i'" ]
console.log(abParser("aibcd")); // [ Symbol(Failed), "Error parsing 'b':", "Unexpected 'i'" ]
```

We are now already reusing building blocks! (`onSuccess`) And we have a correct
result!

## orElse parser

```javascript
const aParser = characterParser("a");
const bParser = characterParser("b");

const orElse = parserA => parserB => stream => "???";

const aOrBParser = orElse(aParser)(bParser);
console.log(aOrBParser("abcd")); // "???"
```

It will follow the same pattern. But the implementation of this one will already
be a lot faster:

```javascript
const onFailure = result => next =>
  result[PARSED] === FAILED ? next(result) : result;

const orElse = parserA => parserB => stream =>
  onFailure(parserA(stream))(() => parserB(stream));

const aOrBParser = orElse(aParser)(bParser);
console.log(aOrBParser("abcd")); // [ 'a', [ 'b', 'c', 'd' ] ]
console.log(aOrBParser("bcde")); // [ 'b', [ 'c', 'd', 'e' ] ]
console.log(aOrBParser("iabcd")); // [ Symbol(Failed), "Error parsing 'b':", "Unexpected 'i'" ]
```

Wow this one worked immediately! This is because we never modify the stream. We
create a new stream every time. So parserB is able to retry it on exactly the
same data.

## All well so far...

The implementation so far:

```javascript
const FAILED = Symbol("Failed");
const PARSED = 0;
const REMAINING = 1;

const parseError = target => error => [
  FAILED,
  `Error parsing: '${target}'`,
  error
];

const characterParser = character => ([head, ...tail]) =>
  head
    ? head === character
      ? [head, tail]
      : parseError(character)(`Unexpected '${head}'`)
    : parseError(character)("Unexpected EOF");

const onSuccess = result => next =>
  result[PARSED] !== FAILED ? next(result) : result;

const onFailure = result => next =>
  result[PARSED] === FAILED ? next(result) : result;

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
```

## Working towards parsing our JSON structure

The challenge was parsing the JSON structure at the top of our file.

An EBNF notation of JSON looks like this:

```ebnf
value = object | array | number | string | "true" | "false" | "null";
string = '"',
  { ? Any unicode character except " or \ or control character ?
  | "\", (
    '"' | "\" | "/" | "b" | "f" | "n" | "r" | "t" |
    "u", 4 * ? hexadeximal digit ?
  ) }, '"';

number = [ "-" ],
  ( "0" | ? digit 1-9 ?, { ? digit ? } ),
  [ ".", ? digit ?, { ? digit ? } ],
  [ ( "e" | "E" ), [ "+" | "-" ], ? digit ?, { ? digit ? } ];

array = "[", [ value, { ",", value } ], "]";
object = "{", [ string, ":", value, { ",", string, ":", value } ], "}";
```

The most simple type in this format would be the `null`. So we should start with
parsing that one.

```javascript
const nParser = characterParser("n");
const uParser = characterParser("u");
const lParser = characterParser("l");

const nullParser = andThen(nParser)(
  andThen(uParser)(andThen(lParser)(lParser))
);

console.log(nullParser("null")); // [ [ 'n', [ 'u', [Array] ] ], [] ]
console.log(nullParser("text"));
```

We can now verify that the string starts with `"null"`. But we also want the
result of parsing not be a nested construction, we want the literal `null` as
result. In this case, we do not need to really process the result. We only need
to verify that the string was `"null"` so that we can return the literal `null`.

Let's create a parser that would return a specific value as result:

```javascript
const resultParser = result => stream => [result, stream];

const returnNullParser = resultParser(null);
console.log(returnNullParser("test")); // [ null, 'test' ]
```

Now we need the characterParsers to verify that the string "null" is in the
stream, and then return the result:

```javascript
const resultParser = result => stream => [result, stream];

const nParser = characterParser("n");
const uParser = characterParser("u");
const lParser = characterParser("l");

const nullParser = andThen(
  andThen(nParser)(andThen(uParser)(andThen(lParser)(lParser)))
)(resultParser(null));

console.log(nullParser("null")); // [ [ [ 'n', [Array] ], null ], [] ]
console.log(nullParser("text")); // [ Symbol(Failed), "Error parsing 'n':", "Unexpected 't'" ]
```

We can now verify that the string contains `"null"` but the result now contains
our converted result, but also the parsed text, that is not needed anymore. We
will create a `andThenRight` function. it will require to parse both results
(like `andThen`) but will only return the result of the right completed parser.

```javascript
const andThenRight = parserA => parserB => stream =>
  onSuccess(andThen(parserA)(parserB)(stream))(result => [
    result[PARSED][1],
    result[REMAINING]
  ]);

const nullParser = andThenRight(
  andThen(nParser)(andThen(uParser)(andThen(lParser)(lParser)))
)(resultParser(null));

console.log(nullParser("null")); // [ null, [] ]
console.log(nullParser("text")); // [ Symbol(Failed), "Error parsing 'n':", "Unexpected 't'" ]
```

Yes! We did a lot of actions here and it would be great to allow reuse by
refactoring. First: Changing the result of a parser (what `thenRight` does)

```javascript
const mapResult = transform => parser => stream =>
  onSuccess(parser(stream))(result => [
    transform(result[PARSED]),
    result[REMAINING]
  ]);

const andThenRight = parserA => parserB =>
  mapResult(result => result[1])(andThen(parserA)(parserB));
```

And we could replace the `nullParser` with the 3 character parsers with this:

```javascript
const stringParser = string =>
  [...string]
    .map(char => characterParser(char))
    .reduce((a, b) => andThen(a)(b));

const nullParser = andThenRight(stringParser("null"))(resultParser(null));
```

Much more readable! But the stringParser is now still doing 2 tasks:

1. convert string characters to a list of character parsers
2. chain the characters parsers using `andThen`

We could split this up as well.

```javascript
const chain = parsers => parsers.reduce((a, b) => andThen(a)(b));
const stringParser = string =>
  chain([...string].map(char => characterParser(char)));

const nullParser = andThenRight(stringParser("null"))(resultParser(null));
```

If we make this one step more generic, we can create the boolean parser as well!

```javascript
const parseStringResult = string => result =>
  andThenRight(stringParser(string))(returnResult(result));

const nullParser = parseStringResult("null")(null);

const boolParser = orElse(parseStringResult("true")(true))(
  parseStringResult("false")(false)
);

console.log(nullParser("null rest")); // [ null, [ ' ', 'r', 'e', 's', 't' ] ]
console.log(boolParser("true rest")); // [ true, [ ' ', 'r', 'e', 's', 't' ] ]
console.log(boolParser("false rest")); // [ false, [ ' ', 'r', 'e', 's', 't' ] ]
console.log(boolParser("fase rest")); // [ Symbol(Failed), "Error parsing 'l':", "Unexpected 's'" ]
```

It works as expected. The problem I have now is the error message is too vague
to know it was from parsing a `null` or a `boolean`.

Time to improve the message in an error occurs. Fortunately, this is really
easy. We can use the `onFailure` we created before to update the error with a
custom message.

```javascript
const addLabel = label => parser => stream =>
  onFailure(parser(stream))(([, , error]) => parseError(label)(error));
```

And now we can use this function to wrap it around the `stringParser`

```javascript
const stringParser = string =>
  addLabel(string)(chain([...string].map(char => characterParser(char))));

console.log(boolParser("fase rest")); // [ Symbol(Failed), "Error parsing 'false':", "Unexpected 's'" ]
```

So we have nice messages as well. The composability of the functions really seem
to pay off. The JSON parser seems to come to shape nicely. There are some things
still bothering about this implementation though and that is that using
JavaScripts own `.map` and `.reduce` seem out of place. But we will first try to
get the JSON parser complete, and then look into those functions.

The implementation so far:

```javascript
const FAILED = Symbol("Failed");
const PARSED = 0;
const REMAINING = 1;

const parseError = target => error => [
  FAILED,
  `Error parsing: '${target}'`,
  error
];

const characterParser = character => ([head, ...tail]) =>
  head
    ? head === character
      ? [head, tail]
      : parseError(character)(`Unexpected '${head}'`)
    : parseError(character)("Unexpected EOF");

const onSuccess = result => next =>
  result[PARSED] !== FAILED ? next(result) : result;

const onFailure = result => next =>
  result[PARSED] === FAILED ? next(result) : result;

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

const andThenRight = parserA => parserB =>
  mapResult(result => result[1])(andThen(parserA)(parserB));

const addLabel = label => parser => stream =>
  onFailure(parser(stream))(([, , error]) => parseError(label)(error));

const chain = parsers => parsers.reduce((a, b) => andThen(a)(b));

const stringParser = string =>
  addLabel(string)(chain([...string].map(char => characterParser(char))));

const parseStringResult = string => result =>
  andThenRight(stringParser(string))(resultParser(result));

const nullParser = parseStringResult("null")(null);

const boolParser = orElse(parseStringResult("true")(true))(
  parseStringResult("false")(false)
);
```

## Conclusion

The code so far:

- We can now combine using `andThen`, `orElse`, `andThenRight`, `addLabel`, and
  `chain`
- We can return a result using `resultParser`
- We can improve parse error messages using `addLabel`
- We can parse a `null`, `true` and `false`

What I learned so far:

- Currying is actually pretty easy to get used to
- Having functions with only one statement doesn't feel like a handicap yet

What did I like:

- Its fun building a parser this way
- Composition feels powerful
- Creating new features seem to profit a lot from existing code, the reuse is
  nice
- Ability to slap on `addLabel` where needed without worrying about changing the
  output format

What did I not like:

- If you want to have many expressions in a single statement, the code does get
  harder to read (lots of parentheses)

Next time:

- Building a quoted string parser
- Building a number parser
- Checking out recursion
