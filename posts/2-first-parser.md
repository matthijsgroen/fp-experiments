# Creating the first Parser (FP Challenge)

So in the folder where I created my `challenge.js` file, I added:

```sh
git init .
yarn init
yarn add eslint --dev
```

> eslint is a linting tool for ECMAScript, where you can define your own rules
> of what you consider to be "good" code.

Now that I added eslint, I could add custom rules, by updating my just generated
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

In eslint, you normally specify an `env` in which the code will be run, like a
`browser`, `node` or `worker`. This will automatically allow a lot of syntax
specific to such an environment. By not specifying an `env`, I was restricting a
lot of standard JS. But in this case even too much. Type objects like `String`,
`Array` and `Number` were also disabled, and `console.log` was also not
allowed.

(normally having no `console.log` is a good thing, it prevents debug or other
info from remaining in your code when it is no longer needed).

But since I was not exporting anything from my file, I needed a way to see some
output of my code. So I enabled `console.log` manually.

Additions to the eslint config:

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
      "no-console": "off"
    }
  }
}
```

The editor I'm using applies these rules directly, so I would have direct
feedback whether I was breaking any of my own rules.

I even added some more rules to prevent cheating:

```json
{
  "eslintConfig": {
    "rules": {
      "no-use-before-define": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
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

Just like
[the Parser Combinator post](https://fsharpforfunandprofit.com/posts/understanding-parser-combinators/),
I started by creating a parser that could only parse a specific single character
from an input (the letter `a`). On success, it should return the parsed result
and the rest of the input. On failure, it should return an indication that it
failed containing the message what it tried to achieve, and why it failed:

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

Using the spread operator (`[head, ...tail]`) I would separate the first
character from the rest, and compare it to the letter "a". Notice that the tail
is automatically transformed into an array of characters.

To change that we could parse more than just the "a", it would be smart to turn
the character we parse into a function argument:

```javascript
const parser = (character, [head, ...tail]) =>
  head === character
    ? [head, tail]
    : [FAILED, `Error parsing '${character}':`, `Unexpected '${head}'`];

console.log(parser("a", "abc")); // [ 'a', [ 'b', 'c' ] ]
console.log(parser("a", "aabc")); // [ 'a', [ 'a', 'b', 'c' ] ]
console.log(parser("a", "bcd")); // [ Symbol(Failed), "Error parsing 'a':", "Unexpected 'b'" ]
```

The output of each `console.log` would be the same. But is it an improvement?

Yes and no.

Yes, we made the character to parse dynamic. And No, because we changed the
function signature.

This last one would seem trivial, but it is not. The reason is that we want to
combine the parser (hence: Parser Combinators). To combine parsers, they should
all follow the same signature. Data string in, and Result and Remaining out, or
an Error with details.

# Currying

To get around this issue, we can use a concept, called _Currying_. As Wikipedia
states it:

> In mathematics and computer science, currying is the technique of translating
> the evaluation of a function that takes multiple arguments into evaluating a
> sequence of functions, each with a single argument.

This would actually mean that our function would not be "data" in, "data" out
like I was used to. It would be "data" in, "function" out. Like a function
factory.

A mathematical example:

```javascript
const add = (a, b) => a + b;
add(1, 3); // 4

const addCurried = a => b => a + b;
const addOne = addCurried(1); // new function
addOne(3); // 4
addOne(5); // 6
addCurried(7)(4); // 11
```

This is a really powerful concept. Not only can we create a function that would
return a letter parser in the parser example, this also means you can capture
some state inside these functions!

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
> need to refresh sometimes to replace a const.

Hmm that last one is not that nice. It is actually stating it reached the end of
the file, so we change it into an EOF error:

```javascript
const characterParser = character => ([head, ...tail]) =>
  head
    ? head === character
      ? [head, tail]
      : [FAILED, `Error parsing '${character}':`, `Unexpected '${head}'`]
    : [FAILED, `Error parsing: '${character}':`, "Unexpected EOF"];

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

So now I can create a parser for any one character I would like. The next step
would be creating a parser that would be a combination of multiple character
parsers.

But, feeling more confident, it was time to enforce more rules:

- Each function could only contain 1 statement.
- Each function should be written as a lambda.
- No if statements

## What is a statement, what is an expression

You can see a statement as a line of code, in JavaScript terminated by a
semi-colon (`;`).

```javascript
const aVar = 2;
const myFunc = number => number * 6;
const result = aVar + 6 * myFunc(3);
```

This code has 3 statements: The definition of `aVar`, `myFunc` and `result`. The
`myFunc` function, has 1 statement: `number * 6`.

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

So now our eslint rules in the `package.json` look like this:

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
        }
      ]
    }
  }
}
```

# Conclusion

The code so far:

- Our parser is now able to parse one character
- We've created an input and output format (result and error) for the parser,
  that other parser should follow as well

What I learned so far:

- Currying

What did I like:

- So far was easy! Writing these lines of code only took a few minutes. We've
  spent more time on setup

What did I not like:

- Nothing so far

Next time:

- Combining parsers into new ones
