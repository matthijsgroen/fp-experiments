It seems the chapters will be:

1. Introduction to the challenge
2. Creating the first parser
3. Combining parsers (null and boolean)
4. Parsing strings and numbers
5. Parsing objects and arrays
6. Fixing the cheats
7. Performance
8. Conclusion

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

1. First parser

- Add notice that input changed to char array using the splat
- Show a `.toString()` of a curried function

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

# Performance

Change input from string/array char to an object with only positions

Final implementation / Final eslint rules
