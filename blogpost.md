# My journey in learning Functional Programming

Hi I'm Matthijs Groen, Frond-end developer at Kabisa, and I would like to share
my experiences with diving into the concepts of Functional Programming. I'm
now 37. I started programming when I was a kid at age of 11. I started out with
GW basic, and at age 16 I started with Turbo Pascal. Turbo Pascal is a
procedural language. In its syntax, it uses a lot of words. `BEGIN` and `END`
blocks.

```pascal
Program My_Program;
Begin
	Write('Hello, what is your name?');
	Readln;
End.
```

When I went to university to learn computer science, we where taught Java. Java
uses already more symbols than words, in the pure syntax, but we where taught to
think "Object Oriented" Objects had names, that stood for something, they had
knowledge in form of state and abilities in form of methods. All having names.
We were taught UML and object Hierarchy. After school, and in my job, I started
to learn Ruby. Ruby is a great language, it is really readable. Everything is an
object! and every call is a message. You have objects, you have modules, you can
change classes, objects on the fly at runtime. It makes it a magical language to
work with. Not only working with objects deepened for me, also was I working
with the Rails framework, where you will write your code according to the
conventions of that framework. Ruby on Rails works according to a Model View
Controller model, dictating what goes where.

```ruby
3.times do
  puts "This will be printed 3 times"
end
```

Working with those conventions made it easier for me to switch to writing
front-end code as well (around 2011). We were building frontend applications in
Backbone.js which also followes the same Model-View-Controller pattern. And then
the Frontend wars broke loose. HTML5 was a thing, CSS3 was a thing, Angular.js,
Ember.js, React, Knockout and others entered the arena. So many choices!

Since we were used to writing frontend apps in Backbone, we didn't want to
change framework every few weeks, we took a bit of a waiting position, to proper
evaluate what would be a good fit as next frontend stack default.

We chose Preact.

For me that changed a lot of how I build applications. Preact is not a framework
(nor is React). They are libraries for rendering UI. You build the framework, on
what is the best fit for your application. It changed for us where logic lived.
Before, it was all in objects and classes. Now it was scattered around
everywhere in loose functions. But having your functions scattered around
everywhere has a benefit. Wherever you see a function that could benefit you,
you could just pick it up and use it. No hidden dependenies, or object
hierarchies. No methods calling events over Radios where others had to reply to.
Just simple data in, data out. I really started to like this approach. It makes
refactoring or moving code around a breeze. I got more colleages on my team that
really were into functional programming. Elixir, Haskell, Monoids, Functors,
Category theory. I didn't understand half of what they were saying. And when I
asked to explain stuff to me, most of the time it only gave me headaches...

But I really started to like working with functions only approach. No
`getName()` that could reply with a different value each time you called it. It
became more predictable. Also working with Redux brought new concepts to the
table. Those of immutability. Not changing data, but reconstructing new data
based on changes.

There are more benefits:

- Since a function only relies on its directly provided input, you can run stuff
  in parallel
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
["Functors, applicatives and modads in pictures"](http://adit.io/posts/2013-04-17-functors,_applicatives,_and_monads_in_pictures.html)
I only started to make sense from it by opening the browser console and started
typing JavaScript to try to follow along.

I could replicate the concepts, but I did not understand them, or how it would
help me write better software.

I was intrieged by
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

Having the blogpost of Parser Combinators ready at hand, it would be a simple
exercise of following along and implementing it in Javascript, and trying to
apply a few more rules along the way. (I was wrong!)

I never knew I would learn so much in a few days...

# Challenge Part 1, starting the parser

If I would be able to complete this challenge, I would also want to share this challenge with colleagues, maybe they wanted to do it as well as learning exercise. So I wanted to add some cheat prevention as well, using eslint.

> eslint is a linting tool voor ecmascript, where you can define your own rules of what you consider to be "good" code.

So in the folder where I created my `challenge.js` file, I added:

```sh
git init .
yarn init
yarn add eslint --dev
```

Now I added eslint, I could add custom rules, by updating my just generated `package.json` file:

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
    "extends": "eslint:recommended",

    "env": {},
    "extends": "eslint:recommended"
  }
}
```

By not specifying an `env` I was restricting a lot of standard JS. But in this case, even too much, so I added a rule to allow some globals. And since I would not use `export` constructs in this file, I would want to use `console.log` for outputting some results.

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

The editor I'm using would directly apply these rules, so I would have
direct feedback whether I was breaking any rules.

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
