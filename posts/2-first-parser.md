# Creating the first Parser (FP Challenge)

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
      "no-restricted-globals": ["error", "JSON"]
    }
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

By using the spread `...tail` operation, the string is converted to an array of
characters.

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
combine the parser (hence: Parser Combinators). To combine parsers, they should
all follow the same pattern. Data string in, and Result and Remaining out, or an
Error with details.

# Currying

To get around this issue, we can use a concept, called Currying. As wikipedia
states it:

> In mathematics and computer science, currying is the technique of translating
> the evaluation of a function that takes multiple arguments into evaluating a
> sequence of functions, each with a single argument.

This would actually mean that our function would not be "data" in, "data" out
like I was used to. It would be "data" in, "function" out. Like a function
factory.

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
const characterParser = character => ([head, ...tail]) =>
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
console.log(aParser("")); // [ Symbol(Failed), "Error parsing 'a':", "Unexpected 'undefined'" ]
```

> On desktop browsers you can follow along by opening the console and pasting
> the code in there. A `const` can only be declared once though, so you might
> need to refresh sometime to replace a const.

Hmm that last one is not that nice. It is actually stating it reached the end of
the file, so we change it in an EOF error:

```javascript
const characterParser = character => ([head, ...tail]) =>
  head
    ? head === character
      ? [head, tail]
      : [FAILED, `Error parsing '${character}':`, `Unexpected '${head}'`]
    : [FAILED, "Error parsing: '${character}'", "Unexpected EOF"];

const aParser = characterParser("a");

console.log(aParser("")); // [ Symbol(Failed), "Error parsing 'a':", "Unexpected EOF" ]
```

The error is improved, but now the construction of an error is duplicated. Let's
refactor that one:

```javascript
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

const aParser = characterParser("a");

console.log(aParser("")); // [ Symbol(Failed), "Error parsing 'a':", "Unexpected EOF" ]
```

So now I could create a parser for any one character I would like. The next
step, creating a parser to combinate others.

But, feeling meer confident, it was time to enfore more rules:

- Each function could only contain 1 statement.
- Each function should be written as a lambda.
- No if statements

## What is a statement, what is an expression

You can see a statement as a line of code, in javascript terminated by a
semi-colon (`;`).

```javascript
const aVar = 2;
const myFunc = number => number * 6;
const result = aVar + 6 * myFunc(3);
```

This code has 3 statements: The defintion of `aVar`, `myFunc` and `result`. The
`myFunc` lambda, has 1 statement: `number * 6`.

An expression is anything that can return a value: `2`, `number`, `6`, `aVar`,
`myFunc(3)`. So in a single statement, you can use multiple expressions, and
combine them even to produce new values. (using addition `+` or multiply `*` for
example).

So the last line is actually 1 statement, containing 4 expressions.

Since we could do quite some work in a single statement, I wanted to limit the
amount of statements for a lambda to 1. With having only 1 statement in a
lambda, you can omit the function body and an explicit return statement.

```javascript
const multiStatementLambda = a => {
  const b = 5;
  return a + b;
};

const singleStatementLamda = a => a + 5;
```

So now our eslint rules in total look like this:

```json
{
  "eslintConfig": {
    "parserOptions": {
      "ecmaVersion": 2018
    },
    "extends": "eslint:recommended",
    "env": {},
    "globals": {
      "Symbol": "readonly",
      "Array": "readonly",
      "String": "readonly",
      "Number": "readonly",
      "console": "readonly"
    },
    "rules": {
      "no-console": ["off"],
      "no-use-before-define": ["error", { "functions": true, "classes": true }],
      "no-eval": ["error"],
      "no-implied-eval": ["error"],
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
        }
      ]
    }
  }
}
```

In the next post of this series we will actually start combining parsers!
