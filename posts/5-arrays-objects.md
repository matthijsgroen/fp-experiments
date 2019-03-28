# Parsing arrays and numbers

This is a continuation of the Functional Programming challenge I gave myself:
Write a JSON parser in JavaScript, using
[the parser combinator principles from the blogpost of Scott Wlaschin](https://fsharpforfunandprofit.com/posts/understanding-parser-combinators/).

At this point, we are able to parse `null`, `true`, `false`, strings and
numbers. In this post we will complete the initial implementation by adding
support for arrays and objects.

In the previous post we rewrote the `.reduce` to use our own. To promote this
behavior, I wanted to get rid of all calls to 'objects'. So I added a new rule
to the ESLint config in my `package.json`:

```json
{
  "eslintConfig": {
    "rules": {
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.type=MemberExpression][callee.property.name!='log']",
          "message": "Not allowed to call object members, except console.log()"
        }
      ]
    }
  }
}
```

While this test for `console.log` is not fool proof, it will start warning about
`.map`, `.join` and `.concat`. So lets start rewriting them:

```javascript
// before
const toList = mapResult(result => [result[0]].concat(result[1]));
// after
const toList = mapResult(result => [...[result[0]], ...result[1]]);
```

Be sure to wrap `result[0]` into an array. In our parser results, this `toList`
is to flatten a list that has the form of: `[a, [b, [c, d]]`. So each time it is
a list being appended to a single value.

```javascript
// before
const toString = mapResult(result => result.join(""));
// after
const reduceStart = reducer => start => tail => doReduce(reducer)(start)(tail);
const join = a => b => String(a) + String(b);
const toString = mapResult(reduceStart(join)(""));
```

I created a `reduceStart` that is a variant of the already made `reduce` (see
previous post), but this time you can provide a start value for the result. This
is so that empty lists are converted to empty strings.

Considering we extracted 2 helper functions, the code of the `toString` is
actually a bit shorter!

```javascript
// before
const stringParser = string =>
  addLabel(string)(chain([...string].map(char => characterParser(char))));
// after
const map = transform => ([head, ...tail]) =>
  head ? [transform(head), ...map(transform)(tail)] : [];

const stringParser = string =>
  addLabel(string)(chain(map(characterParser)([...string])));
```

Here I made a `map` function, just like we created the `reduce` before (see
previous post). There are other functions using `.map` that I needed to convert:

```javascript
// before
const escapedCharParser = choice(
  specialCharacters.map(([match, result]) => parseStringResult(match)(result))
);

// after
const escapedCharParser = choice(
  map(([match, result]) => parseStringResult(match)(result))(specialCharacters)
);
```

Apart from the small change in order (transform before the list) the setup is
basically the same.

```javascript
// before
const anyOf = string => choice([...string].map(characterParser)([...string]));

// after
const anyOf = string => choice(map(characterParser)([...string]));
```

So that was not that hard, and now we are able to enforce another rule!

Now, onto parsing arrays!

## Parsing an JSON array

[As Scott Wlashin explains in his excellent series](https://fsharpforfunandprofit.com/posts/understanding-parser-combinators-4/#5-parsing-array),
there is a problem with parsing an array as can be seen in the EBNF notation:

```ebnf
value = object | array | number | string | "true" | "false" | "null";
array = "[", [ value, { ",", value } ], "]";
```

A value could be an `array`, and an array consists of `value`! there is a
circular reference here. How can you write a parser that needs to parse itself
as well?

Scott Wlashin fixes this by using a
[forward declaration](https://en.wikipedia.org/wiki/Forward_declaration). A
forward declaration is a placeholder, that will be replaced later on.

I tried to follow this pattern in my implementation as well:

```javascript
const forwardReference = (impl = () => [FAILED, "Unforfilled"]) => [
  stream => impl(stream),
  update => (impl = update)
];

const [valueParser, updateValueParserRef] = forwardReference();
console.log(valueParser("hello")); // [ Symbol(Failed), 'Unforfilled' ]
updateValueParserRef(characterParser("h"));
console.log(valueParser("hello")); // [ 'h', [ 'e', 'l', 'l', 'o' ] ]
```

The linter didn't complain, my implementation worked, so I was happy! Time to
start parsing that array!

These are some examples we should be able to parse:

```
[null, 1, 3  , [ true ] ]
[ "string [ , ", false]
```

As you can see from these examples, in and around the brackets `[]` and the
seperator `,` we can have all kinds of whitespace that does not matter. So we
need some way to ignore those:

```javascript
const whitespace = " \n\t";
const whitespaceParser = many(anyOf(whitespace));

const ignoreTrailingSpaces = parser => andThenLeft(parser)(whitespaceParser);

const arrayStart = ignoreTrailingSpaces(characterParser("["));
const arrayEnd = ignoreTrailingSpaces(characterParser("]"));
const arraySep = ignoreTrailingSpaces(characterParser(","));

console.log(arrayStart("[    null, 1 ]")); // [ '[', [ 'n', 'u', ...
```

Nice the spaces are ignored and the next character is waiting to be parsed! Now
to define our array value parser, that makes use of our forward reference:

```javacript
const arrayValue = ignoreTrailingSpaces(valueParser);
```

Now we need some parser that can parse a list, using a kind of seperator. By
combining parsers, we are looking for something like this:

```javascript
const arrayValues = sepBy(arraySep)(arrayValue);
```

That ideally would ignore the seperators in the result, and make a flat list of
the result of the values.

Let's build one:

```javascript
const sepBy = sepParser => parser => andThen(parser)(sepParser);

const dummyArrayValueParser = sepBy(arraySep)(nullParser);
console.log(dummyArrayValueParser("null,    null,   null"));
// [ [ null, ',' ],
//   [ 'n', 'u', 'l', 'l', ',', ' ', ' ', ' ', 'n', 'u', 'l', 'l' ] ]
```

After a seperator, we always need to find another element:

```javascript
const sepBy = sepParser => parser =>
  andThen(parser)(andThenRight(sepParser)(parser));

const dummyArrayValueParser = sepBy(arraySep)(nullParser);
console.log(dummyArrayValueParser("null,    null,   null"));
// [ [ null, null ], [ ',', ' ', ' ', ' ', 'n', 'u', 'l', 'l' ] ]
```

But those separators and values can be repeated N times:

```javascript
const sepBy = sepParser => parser =>
  andThen(parser)(many(andThenRight(sepParser)(parser)));

const dummyArrayValueParser = sepBy(arraySep)(nullParser);
console.log(dummyArrayValueParser("null,    null,   null"));
// [ [ null, [ null, null ] ], [] ]
```

Yes! now to flatten that list, by using concat:

```javascript
const sepBy = sepParser => parser =>
  toList(andThen(parser)(many(andThenRight(sepParser)(parser))));
```

But what if the array would be empty?

```javascript
const dummyArrayValueParser = sepBy(arraySep)(nullParser);
console.log(dummyArrayValueParser(""));
// [ Symbol(Failed), "Error parsing 'null':", 'Unexpected EOF' ]

console.log(dummyArrayValueParser("null"));
// [ [ null ], [] ]
```

So our implementation would require at least one value. So we rename the
function to `sepBy1` and create a new one that would accept 'no values'

```javascript
const sepBy1 = sepParser => parser =>
  toList(andThen(parser)(many(andThenRight(sepParser)(parser))));

const sepBy = sepParser => parser =>
  orElse(sepBy1(sepParser)(parser))(resultParser([]));
```

So now our array parser is complete!

```javascript
const arrayValues = sepBy(arraySep)(arrayValue);
const arrayParser = addLabel("array")(
  between(arrayStart)(arrayEnd)(arrayValues)
);
```

We can test it out by fulfilling our forward reference:

```javascript
updateValueParserRef(
  choice([
    nullParser,
    boolParser,
    numberParser,
    quotedStringParser,
    arrayParser
  ])
);

// parsing our examples:
console.log(valueParser("[null, 1, 3  , [ true ] ]"));
// [ [ null, 1, 3, [ true ] ], [] ]

console.log(valueParser('[ "string [ , ", false]'));
// [ [ 'string [ , ', false ], [] ]
```

We can now already parse quite some JSON. The only thing missing right now, is
`object`s.

## Parsing JSON objects

The EBNF definition for a JSON object is:

```ebnf
object = "{", [ string, ":", value, { ",", string, ":", value } ], "}";
```

So, "Between" brackets, are key-value pairs "seperated" by a comma. The
key-value pair is a String, ":", value. I think we already have all ingredients
for this one! Maybe we need to add some code to produce the end result, but
parsing wise we should already be close!

```javascript
const objectStart = ignoreTrailingSpaces(characterParser("{"));
const objectEnd = ignoreTrailingSpaces(characterParser("}"));
const objectPairSep = ignoreTrailingSpaces(characterParser(","));
const objectKeyValSep = ignoreTrailingSpaces(characterParser(":"));
const objectKey = ignoreTrailingSpaces(quotedStringParser);
const objectValue = ignoreTrailingSpaces(valueParser);
const objectKeyValue = andThen(andThenLeft(objectKey)(objectKeyValSep))(
  objectValue
);

const objectParser = between(objectStart)(objectEnd)(
  sepBy(objectPairSep)(objectKeyValue)
);

console.log(objectParser('{ "hello": "world", "fp": true }'));
// [ [ [ 'hello', 'world' ], [ 'fp', true ] ], [] ]
```

The default result is already a list of key-value pairs. Now to put them into an
object:

```javascript
const toObject = doReduce(result => ([key, value]) => ({
  ...result,
  [key]: value
}))({});

const objectParser = mapResult(toObject)(
  between(objectStart)(objectEnd)(sepBy(objectPairSep)(objectKeyValue))
);

console.log(objectParser('{ "hello": "world", "fp": true }'));
// [ { hello: 'world', fp: true }, [] ]
```

Now to update our value choice, so that objects are included:

```javascript
updateValueParserRef(
  choice([
    nullParser,
    boolParser,
    numberParser,
    quotedStringParser,
    arrayParser,
    objectParser // new!
  ])
);

const jsonParser = stream =>
  onSuccess(andThenRight(whitespaceParser)(valueParser)(stream))(
    ([result, remaining]) =>
      remaining.length > 0
        ? [FAILED, "Unexpected characters:", remaining]
        : result
  );

// data is our challenge data, see post 1
console.log(jsonParser(data)); // Works!
```

I added a `jsonParser` to check after parsing if there are no remaining
characters left. If there are, return an error. If not, return the parsed
result.

Now I only need to build our `get` function to get value from our data, to
complete the challenge, and we need to check if we can tick a box for all the
rules we applied.

## Getting data out of our JSON structure

In the definition of the challenge, there were 3 calls that we should be able to
do:

```json
{
  "goals": [
    "get(data)(\"using.disallowed.0\") should result in \"No dependencies\"",
    "get(data)(\"points.full-json\") should result in 1000",
    "get(data)(\"jsonTypes.2\") should result in false"
  ]
}
```

The thing is, the argument from the `get` is also a string that needs to be
parsed! (separted by `.` dots).

And we made just the tools to do that...

```javascript
const pathElementParser = toString(some(satisfy(c => c !== ".")));
const split = sepBy(characterParser("."))(pathElementParser);

const get = data => path =>
  doReduce(result => item => result && result[item])(data)(split(path)[0]);

const jsonGet = get(parsedData);

console.log(jsonGet("using.disallowed.0"));
console.log(jsonGet("points.full-json"));
console.log(jsonGet("jsonTypes.2"));
```

Challenge completed!

But there were some things still bothering me. I did an assignment in the
forward reference, and that felt like cheating. But first lets see how we score
on the restrictions we applied, by looking at the defined ESLint rules of our
`package.json`...

```json
{
  "eslintConfig": {
    "globals": {
      "Symbol": "readonly",
      "Array": "readonly",
      "String": "readonly",
      "Number": "readonly",
      "console": "readonly"
    },
    "rules": {
      "no-console": "off",
      "no-use-before-define": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-restricted-globals": ["error", "JSON"],
      "max-statements": ["error", 1, { "ignoreTopLevelFunctions": false }],
      "complexity": ["error", { "max": 3 }],
      "arrow-body-style": ["error", "as-needed"],
      "no-restricted-syntax": [
        "error",
        {
          "selector": "FunctionExpression",
          "message": "Please use Lambda notation () =>"
        },
        {
          "selector": "IfStatement",
          "message": "Try using ternary operator: true ? 1 : 2"
        },
        {
          "selector": "VariableDeclaration[kind=let],VariableDeclaration[kind=var]",
          "message": "Only use constants"
        },
        {
          "selector": "ArrowFunctionExpression[params.length > 1]",
          "message": "Only 1 argument allowed. Please use currying"
        },
        {
          "selector": "CallExpression[callee.type=MemberExpression][callee.property.name!='log']",
          "message": "Not allowed to call object members, except console.log()"
        }
      ]
    }
  }
}
```
