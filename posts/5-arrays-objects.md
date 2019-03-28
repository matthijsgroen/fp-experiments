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

# Parsing an JSON array

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
[null, 1, 3  , ]
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

Yes!
