# Creating the first Parsers (FP Challenge)

So in the folder where I created my `challenge.js` file, I added:

```sh
git init .
yarn init
yarn add eslint --dev
```

> eslint is a linting tool for EcmaScript, where you can define your own rules
> of what you consider to be "good" code.

Now I added eslint, I could add custom rules, by updating my just generated
`package.json` file:

```json
{
  "name": "json-parse-fp",
  "version": "1.0.0",
  "main": "index.js",
  "author": "Matthijs Groen <matthijs@kabisa.nl>",
  "license": "MIT",
  "devDependencies": {
    "eslint": "^5.15.1"
  },
  "eslintConfig": {
    "parserOptions": {
      "ecmaVersion": 2018
    },
    "env": {},
    "extends": "eslint:recommended"
  }
}
```

By not specifying an `env` I was restricting a lot of standard JS. But in this
case, even too much, so I added a rule to allow some globals. And since I would
not use `export` constructs in this file, I would want to use `console.log` for
outputting some results.

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
      "no-console": ["off"]
    }
  }
}
```

The editor I'm using would directly apply these rules, so I would have direct
feedback whether I was breaking any rules.

I even added some more rules, to prevent cheating:

```json
{
  "eslintConfig": {
    "rules": {
      "no-use-before-define": ["error", { "functions": true, "classes": true }],
      "no-eval": ["error"],
      "no-implied-eval": ["error"],
      "no-restricted-globals": ["error", "JSON"],
  }
}
```

So now when I would try to lint:

```javascript
const data = '{ "foo": 42 }';
JSON.parse(data);
eval("JSON.parse(data)");
```

I would get the output:

```
  2:1  error  Unexpected use of 'JSON'  no-restricted-globals
  3:1  error  eval can be harmful       no-eval

✖ 2 problems (2 errors, 0 warnings)
```

Great! Let's start!

## Parsing the first character

Just like the Parser Combinator post, I started by parsing my first character:

```javascript
const FAILED = Symbol("Failed");

const aParser = ([head, ...tail]) =>
  head === "a"
    ? [head, tail]
    : [FAILED, "Error parsing 'a':", `Unexpected '${head}'`];

console.log(aParser("abc")); // [ 'a', [ 'b', 'c' ] ]
console.log(aParser("aabc")); // [ 'a', [ 'a', 'b', 'c' ] ]
console.log(aParser("bcd")); // [ Symbol(Failed), "Error parsing 'a':", "Unexpected 'b'" ]
```

Using the spread operator I would separate the first character from the rest,
and compare it to the letter "a".

Then based on the success of the character, I would either:

- Return the parsed character, and the remaining characters; or
- Return a "FAILED" with information about the error (what we tried to parse,
  and what got in the way)

To change that we could parse more than just the "a", it would be smart to turn
that into an function argument:

```javascript
const parser = (character, [head, ...tail]) =>
  head === character
    ? [head, tail]
    : [FAILED, `Error parsing '${character}':`, `Unexpected '${head}'`];

console.log(aParser("abc")); // [ 'a', [ 'b', 'c' ] ]
console.log(aParser("aabc")); // [ 'a', [ 'a', 'b', 'c' ] ]
console.log(aParser("bcd")); // [ Symbol(Failed), "Error parsing 'a':", "Unexpected 'b'" ]
```

The output of each console.log would be the same. But is it an improvement?

Yes and no.

Yes, we made the character to parse dynamic. And No, because we changed the
function signature.

This last one would seem trivial, but it is not. The reason is that we want to
combine parser (hence: Parser Combinators). To combine parsers, they should all
follow the same pattern. Data string in, and Result and Remaining out, or an
Error with details.

# Currying

To get around this issue, we can use a concept, called Currying. As wikipedia
states it:

> In mathematics and computer science, currying is the technique of translating
> the evaluation of a function that takes multiple arguments into evaluating a
> sequence of functions, each with a single argument.

This would actually mean that our function would not be "data" in, "data" out
like I was used to. It would be "data" in, "function" out.

A Mathematic example:

```javascript
const add = (a, b) => a + b;
add(1, 3); // 4

const addCurried = a => b => a + b;
const addOne = addCurried(1); // new function
addOne(3); // 4
addOne(5); // 6
addCurried(7)(4); // 11
```

This is a really powerful concept. Not could this means we could create a
function that would return a letter parser in the parser example, this also
means you can capture some state inside these functions!

Time to update the parser:

```javascript
const characterParser = character => [head, ...tail]) =>
  head === character
    ? [head, tail]
    : [FAILED, `Error parsing '${character}':`, `Unexpected '${head}'`];

const aParser = characterParser("a");
const bParser = characterParser("b");

console.log(aParser("abc"));
console.log(aParser("abc")); // [ 'a', [ 'b', 'c' ] ]
console.log(aParser("aabc")); // [ 'a', [ 'a', 'b', 'c' ] ]
console.log(aParser("bcd")); // [ Symbol(Failed), "Error parsing 'a':", "Unexpected 'b'" ]
console.log(bParser("bcd")); // [ 'b', [ 'c', 'd' ] ]
```

So now I could create a parser for any one character I would like. The next
step, creating a parser to combinate others.

## andThen parser

> I'm following the blogpost of
> https://fsharpforfunandprofit.com/posts/understanding-parser-combinators/
> Therefore, I'm skipping over a lot of details. For more detailed explanations,
> please read the original blogpost
