TODO:

- Add section to last post to put proper names on things
  - Since a function only relies on its directly provided input, and is not
    allowed to change that input, not handling the result would actually make
    the function call as if it never happened. (PaBa: is dit niet 'no
    side-effects' en 'idempotent' en zo ja: laat je deze termen bewust weg omdat
    je dit pas later "ontdekte"?)

* Setup eslint rules:
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
