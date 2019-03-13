# My journey in learning Functional Programming

## Why learn functional programming?

## "Benefits"

- Parallellism, networking / clusters
- Immutability
- Composability

## Where did I come from

- Java at school (object oriented)
- Ruby (object oriented)
- Backbone.js (object oriented)
- React (oo, functional style)

## Troubles learning

- Jargon means nothing to me (Monoids, Functors?)

# Reading/watching content

- F# Parser combinators
  https://www.youtube.com/watch?v=RDalzi7mhdY
- The next great functional programming language
  https://www.youtube.com/watch?v=buQNgW-voAg

# The Challenge

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

- Setting up the parser return value:
  [FAILED, errMessage] | [result, remaining]
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
