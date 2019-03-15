# Combining parsers

I'm following the blogpost of
https://fsharpforfunandprofit.com/posts/understanding-parser-combinators/
Therefore, I'm skipping over a lot of details. For more detailed explanations,
please read the original blogpost.

Since I have now also enabled a 'single statement' rule, my implementation will
start to deviate from the one in the parser combinators blogpost.

## Recap

At this point, we are able to parse a single character from a character array or
string. We have applied a lot of eslint rules, to force us to take a more and
more functional approach. In this post, we will start combining the parsers to
create more semantical constructions.

## Combining parsers

We established a signature for our parser:

```
(input: string) =>
  [result: string, remaining: string] |
  [FAILURE, parseAttemptMessage: string, parseEncounteredMessage: string]
```

To actually parse more than one character, we want to create structure how the
parser should continue when succesful or when it fails, by creating 2 more
parsers:

- andThen (to chain a parser after a succesful first parser)
- orElse (to try an alternative parser after a failed attempt of the first
  parser)

## andThen parser

```javascript
const validData = "abcd";
const invalidData1 = "iabcd";
const invalidData2 = "aibcd";
const aParser = characterParser("a"); // see 'first-parser' post
const bParser = characterParser("b");

const andThen = parserA => parserB => stream => "???";

const abParser = andThen(aParser)(bParser);
console.log(abParser(validData)); // ???
```

We ar now just testing out the signature. We want to use 2 parsers, and that
would produce a new parser that accepts the stream.

Just starting on running parserA:

```javascript
const andThen = parserA => parserB => stream => parserA(stream);

const abParser = andThen(aParser)(bParser);
console.log(abParser(validData)); // ["a", ["b", "c", "d"]]
console.log(abParser(invalidData1)); // [ Symbol(Failed), "Error parsing
'a':", "Unexpected 'i'" ]
console.log(abParser(invalidData2)); // ["a", ["b", "c", "d"]]
```

Now we need to chain parserB to it if successful:

```javascript
const PARSED = 0;
const onSuccess = result => next =>
  result[PARSED] !== FAILED ? next(result) : result;
```

Using this function, I can determine if we had a success, and when we do, it
will execute the next step, providing the result.

And now in action:

```javascript
const REMAINING = 1;
const andThen = parserA => parserB => stream =>
  onSuccess(parserA(stream))(result => parserB(result[REMAINING]));

const abParser = andThen(aParser)(bParser);
console.log(abParser(validData)); // [ 'b', [ 'c', 'd' ] ]
console.log(abParser(invalidData1)); // [ Symbol(Failed), "Error parsing
'a':", "Unexpected 'i'" ]
console.log(abParser(invalidData2)); // [ Symbol(Failed), "Error parsing
'b':", "Unexpected 'i'" ]
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

console.log(abParser(validData)); // [ [ 'a', 'b' ], [ 'c', 'd' ] ]
console.log(abParser(invalidData1)); // [ Symbol(Failed), "Error parsing
'a':", "Unexpected 'i'" ]
console.log(abParser(invalidData2)); // [ Symbol(Failed), "Error parsing
'b':", "Unexpected 'i'" ]
```

We are now already reusing building blocks! (`onSuccess`) And we have a correct
result!

## orElse parser

```javascript
const validData1 = "abcd";
const validData2 = "bcde";
const invalidData = "iabcd";
const aParser = characterParser("a");
const bParser = characterParser("b");

const orElse = parserA => parserB => stream => "???";

const aOrBParser = orElse(aParser)(bParser);
console.log(aOrBParser(validData1)); // ???
```

It will follow the same pattern. But the implementation of this one will already
be a lot faster:

```javascript
const onFailure = result => next =>
  result[PARSED] === FAILED ? next(result) : result;

const orElse = parserA => parserB => stream =>
  onFailure(parserA(stream))(() => parserB(stream));

const aOrBParser = orElse(aParser)(bParser);
console.log(aOrBParser(validData1)); // [ 'a', [ 'b', 'c', 'd' ] ]
console.log(aOrBParser(validData2)); // [ 'b', [ 'c', 'd', 'e' ] ]
console.log(aOrBParser(invalidData)); // [ Symbol(Failed), "Error parsing
'b':", "Unexpected 'i'" ]
```

Wow this one worked immidiately! This is because we never modify the stream. We
create a new stream every time. So parserB is able to retry it on exactly the
same data.

## All well so far...

The implementation so far:

```javascript
const FAILED = Symbol("Failed");
const PARSED = 0;
const REMAINING = 1;

const characterParser = character => ([head, ...tail]) =>
  head === character
    ? [head, tail]
    : [FAILED, `Error parsing '${character}':`, `Unexpected '${head}'`];

const onSuccess = result => next =>
  result[PARSED] !== FAILED ? next(result) : result;

const onFailure = result => next =>
  result[PARSED] === FAILED ? next(result) : result;

const andThen = parserA => parserB => stream =>
  onSuccess(parserA(stream))(result => parserB(result[REMAINING]));

const orElse = parserA => parserB => stream =>
  onFailure(parserA(stream))(() => parserB(stream));
```

Next time we will cover the more elaborate constructs, and this is where some
cracks started to emerge in my pure FP, curry-all-the-things approach...
