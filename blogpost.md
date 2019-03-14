# My journey in learning Functional Programming

Hi I'm Matthijs Groen, Frond-end developer at Kabisa, and I would like to share
my experiences with diving into the concepts of Functional Programming. Before
we dive into the Functional Programming (FP) goodness, I'd like to share where I
was coming from, and why I had so much trouble adjusting to the FP concepts.

I spend most of my developer life writing Object Oriented code, and even some
procedural code before that. In Object oriented programming (at least how I was
taught) How you name objects, methods etc. mattered.

I have worked with Ruby on Rails for years. Not only was everything an object in
that language, Rails itself is a framework with "conventions". These conventions
make you productive in some cases, but also make you feel trapped in others.

```ruby
3.times do
  puts "This will be printed 3 times"
end
```

> Yes, even a number is an object.

After working with Ruby (doing full-stack), my work changed to be more frontend
only. We used Backbone.js for years. Backbone, just like Ruby on Rails is Object
Oriented, and follows the Model-View-Controller pattern.

A few years ago we changed the frontend stack from Backbone.js (in combination
with Coffeescript) to Preact, Redux and modern EcmaScript.

The thing I liked most when I just switched from Backbone.js to Preact was the
way you could nest views. In Backbone this really was a pain. So you would end
up with big templates. In Preact, you make a small reusable Component from
everything, and nesting views was actually _the_ way to build up your UI.

It also changed for us where logic lived.

The location of logic was no longer decided by the framework. You could put it
everywhere. This made the business logic totally separate and on its own. Easier
to test, in loose small functions. No framework to have any opinion about it.
Data in, data out. Just functions, and functions calling other functions.

No hidden dependencies, or object hierarchies.

It makes refactoring or moving code around a breeze. Now not only the views
where composable, the whole software became composable.

```jsx
<HeaderBar theme={"blue"}>
  <SiteMenu />
  <UserProfile user={user} />
</HeaderBar>
```

> Nesting views (Components) in Preact is as easy as nesting HTML self.

## First steps...

I really started to like this approach. I got more colleagues on my team that
**really** were into functional programming. Elixir, Haskell, Monoids, Functors,
Category theory. I didn't understand half of what they were saying. And when I
asked to explain stuff to me, most of the time it only gave me headaches...

But I really started to like working with functions only approach. No
`getName()` that could reply with a different value each time you called it. It
became more predictable. Also working with Redux brought new concepts to the
table. Those of immutability. Not changing data, but reconstructing new data
based on changes.

### An example:

Before:

```javascript
class Person {
  constructor(firstName, lastName, age) {
    super
    this.firstName = firstName;
    this.lastName = lastName;
    this.age = age;
  }

  getName() { return `${this.firstName} ${this.lastName}`; }
  getAge() { return this.age; }
  increaseAge(amount) { this.age += amount; }
}

const me = new Person("Matthijs", "Groen", 37);
me.getAge(); // 37
me.increaseAge(1);
me.getAge(); // 38
me.getName(); // Matthijs Groen
```

After:

```javascript
const me = {
  firstName: "Matthijs",
  lastName: "Groen",
  age: 37
};

const getName = person => `${person.firstName} ${person.lastName}`;
const getAge = person => person.age;
const increaseAge = (person, amount) => ({
  ...person,
  age: person.age + amount
});

getAge(me); // 37
const olderMe = increaseAge(me, 1);
getAge(me); // still 37!
getAge(olderMe); // 38!
getName(me); // Matthijs Groen
```

There are more benefits:

- Since a function only relies on its directly provided input, and is not
  allowed to change that input, not handling the result would actually make the
  function call as if it never happened.
- When you are not allowed to change things, you know what data you are dealing
  with. It did not change by itself, unless you got new data after calling a
  function to change the data.
- Since this locking of input and output is so strict, you can cache processes
  better, skipping performance heavy steps.
- Reusability is very, very high.

So I wanted to learn more about these concepts, and practise them. I wanted to
understand all "the fuss".

But there is a big gap coming from an object oriented world, where language
where designed to be easily readable, and code was written as if they where
stories, and going to a world where stuff is expressed as math, and concepts
with strange names are explained by even more strange names to me.

```haskell
fmap :: (a -> b) -> f a -> f b
```

yep.

A colleague pointed me to
["Functors, applicatives and monads in pictures"](http://adit.io/posts/2013-04-17-functors,_applicatives,_and_monads_in_pictures.html)
I only started to make sense from it by opening the browser console and started
typing JavaScript to try to follow along.

I could replicate the concepts, but I did not understand them, or how it would
help me write better software.

I was intrigued by
[a video about Parser Combinators](https://www.youtube.com/watch?v=RDalzi7mhdY),
because I work and create DSLs in various projects. It looked like fun to build
something like that for myself.

So I decided to create a challenge for myself, to learn more about Functional
Programming, and playing around with the concept of Parser Combinators.

# The Challenge

Since I'm more of a learning by doing kind of guy, and work only in JavaScript
nowadays, I opened my editor and defined the following challenge:

```javascript
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
```

Would I be able to create purely functional code to parse the JSON defined?

Yes, I even added a `Recursion to own function` in there, after watching
["The next great functional programming language"](https://www.youtube.com/watch?v=buQNgW-voAg)
just to see if it would really be possible.

> In this talk, John de Goes argues that a good programming language could do
> without:
>
> Pattern matching, Records, Modules, Syntax, Type classes, Nominative typing,
> Data, Recursion

<https://www.slideshare.net/jdegoes/the-next-great-functional-programming-language>

Having the blogpost of Parser Combinators ready at hand, it would be a simple
exercise of following along and implementing it in Javascript, and trying to
apply a few more rules along the way. (I was wrong!)

I never knew I would learn so much in a few days...

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

# Playing around with ESLint

For the functional programming challenge I created for myself, I wanted to
restrict myself from cheating, and forcing myself to a particular syntax. To do
this, I used ESLint.

> eslint is a linting tool for EcmaScript, where you can define your own rules
> of what you consider to be "good" code.

ESLint has no fixed set of rules. There are recommended configurations for
different environments, but you are free to add or modify your own rules.

There is one rule that is really, really powerful: `no-restricted-syntax`
(https://eslint.org/docs/rules/no-restricted-syntax)

It works like this: The EcmaScript/JavaScript you write is a piece of text that
goes through a parser. This parser in turn will create a data model of the code
that has been typed. You can see this in action using https://eslint.org/parser/
. You can enter code in the left input, and it will show the AST (Abstract
Syntax Tree) on the right side.

You can compare this tree a bit like HTML also is a tree of nodes (and
attributes). And following this same concept, you can target specific elements
in this tree using a selector (just like in CSS!)

https://eslint.org/docs/developer-guide/selectors

To show you some examples how neat this is:

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CatchClause > BlockStatement[body.length=0]",
        "message": "No empty catch blocks!"
      }
    ]
  }
}
```

This line will now add an error if you have empty catch blocks.

or this one:

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CatchClause > :not(CallExpression[callee.name=\"logError\"])",
        "message": "No Error reporting called in catch block"
      }
    ]
  }
}
```

Having the option for a custom message can also give hints of how you want it to
be done:

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "FunctionExpression",
        "message": "Please use the lambda () => notation"
      },
      {
        "selector": "VariableDeclarator[id.name=/get.*/] > ArrowFunctionExpression > AssignmentExpression",
        "message": "No assignments in getters"
      },
      {
        "selector": "VariableDeclarator[id.name=/select.*/] > ArrowFunctionExpression[params.0.name!=\"state\"]",
        "message": "First argument should be called state"
      }
    ]
  }
}
```

TODO:

- Explain challenge I made for myself, in JS
- Explain no-restricted-syntax

  - https://eslint.org/docs/rules/no-restricted-syntax#disallow-specified-syntax-no-restricted-syntax
  - AST selectors
  - Online parser

- Setup eslint rules:
  - No JSON parse
  - No eval, implied eval
  - No if statements
  - Max complexity
  - Single statement
  - No functions, only lambda's
  - No use before define
  - Allow console.log for output
  - No var / let

## Step 1: Currying

- Functions producing functions
- Setup eslint rule:
  - Max 1 argument

## Step 2: Following the blogpost

https://fsharpforfunandprofit.com/posts/understanding-parser-combinators/

### First parser

- Setting up the parser return value: [FAILED, errMessage] | [result, remaining]
  (Using Symbol)

- Creating the first parser

### First recursion

- First recursions

### Shielding map and reduce

- Using .map and .reduce, -> Make curried version (as shell)

### Forward declaration

- value -> array -> value ...

## Step 3: The Y Combinator

- Setup eslint rule:

  - No object function calls

- Re-implementing .map and .reduce
- Self calling recursion name = () => name()

## The Y Combinator voodoo

https://blog.klipse.tech/lambda/2016/08/10/almost-y-combinator-javascript.html

`Y = f => (x => x(x))(x => f(y => x(x)(y)))`

- Rebuilding map
- Rebuilding reduce

## Removing the dirty forward declaration

- Why it is wrong in FP world anyway
- Passing in the value parser
- Y Combinate again

- Setup eslint rules:

  - No assignments

Final implementation / Final eslint rules
