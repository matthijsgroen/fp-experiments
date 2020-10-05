# Fixing recursion

This is a continuation of the Functional Programming challenge I gave myself:
Write a JSON parser in JavaScript, using
[the parser combinator principles from the blogpost of Scott Wlaschin](https://fsharpforfunandprofit.com/posts/understanding-parser-combinators/).

At this point, I already have a functional implementation of a JSON parser, and
a method to extract data from the JSON structure. However, I cheated during the
implementation by using an assignment, within a forward reference construction.

I needed a forward reference to fool the code that I had a JSON value parser so
that I could build an array and object parser that needed these, but would be
part of a value parser themselves.

To force myself in not doing any assignments again, I added a eslint rule for
it:

```json
{
  "eslintConfig": {
    "rules": {
      "no-restricted-syntax": [
        "error",
        {
          "selector": "AssignmentPattern,AssignmentExpression",
          "message": "State must be immutable"
        }
      ]
    }
  }
}
```

Now I would receive an error in my forward reference construct:

```javascript
const forwardReference = (impl = () => [FAILED, "Unforfilled"]) => [
  stream => impl(stream),
  update => (impl = update)
];

const [valueParser, updateValueParserRef] = forwardReference();
```

```
179:27  error  State must be immutable  no-restricted-syntax
181:14  error  State must be immutable  no-restricted-syntax

✖ 2 problems (2 errors, 0 warnings)
```

I also wanted to remove the self referencing recursion, that was part of a lot
of functions, such as `map`:

```
const map = transform => ([head, ...tail]) =>
  head ? [transform(head), ...map(transform)(tail)] : [];
```

I could not make a rule for this using the `no-restricted-syntax`, so I even had
to create my own ESLint plugin for this.

I added the `eslint-plugin-fp-challenge` package to the project, and I could add
my newly created rule:

```json
{
  "eslintConfig": {
    "plugins": ["fp-challenge"],
    "rules": {
      "fp-challenge/no-self-reference": "error"
    }
  }
}
```

The following functions in my implementation were now triggering an error:

- `map`
- `doReduce`
- `many`

I did not have a clue yet on how to 'fix' this, but I was willing to learn how a
construction would be possible without calling the name of your own function.

https://www.slideshare.net/jdegoes/the-next-great-functional-programming-language

A colleague with far more experience in FP than me, said I should checkout a
"Fixed-point combinator", also called a "Y-Combinator". Going to a
[wikipedia page](https://en.wikipedia.org/wiki/Fixed-point_combinator) about it
however, just made my head spin.

I did find a JavaScript implementation though:

```javascript
const Y = f => (x => x(x))(y => f(x => y(y)(x)));
```

What it did, or how it worked, I still needed to figure that out. But I wanted
to test it on a simple example code, using Fibonacci.

```javascript
const fibonacci = n => (n < 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2));

console.log(fibonacci(1)); // 1
console.log(fibonacci(2)); // 2
console.log(fibonacci(3)); // 3
console.log(fibonacci(4)); // 5
console.log(fibonacci(5)); // 8
console.log(fibonacci(6)); // 13
```

Using this "Y-combinator" I was able to write:

```javascript
const fibonacci = f => n => (n < 2 ? 1 : f(n - 1) + f(n - 2));
console.log(Y(fibonacci)(6)); // 13
```

It is pure Voodoo! How could this work? I did want to figure that out, so that I
at least new how it was working before putting it in my code. I did a lot of
reading and figuring out. But let me try to explain what is happening, using the
fibonacci implementation.

```javascript
const fibonacci = n => (n < 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2));
```

This is the basic implementation. It does reference itself `fibonacci` within
the function. Next step would be to change that, by passing in the function that
should be called.

```javascript
const fibonacci2 = fibonacci => n =>
  n < 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2);
```

So now the function does not reference itself, because the outer function is
called `fibonacci2` and the inner function is passed in.

Let's try calling it, and passing itself in:

```javascript
console.log(fibonacci2(fibonacci2)(1)); // 1
console.log(fibonacci2(fibonacci2)(6));
// n =>
//   n < 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2)n =>
//   n < 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2)
```

Ouch, the sub calls don't know the change in signature, so we get the function
code itself concatenated.

Let's check out that first part of the Y-combinator code.

`x => x(x)`

So its a function, where 'x' goes in, and gets executed with 'x'.

Lets just investigate that one:

```javascript
const refProducer = ref => ref(ref);
```

Since the ref we pass in gets executed, we know we have to put a function in
there.

Lets put a function in that would produce `"a"`.

```javascript
console.log(refProducer(() => "a")); // "a"
```

ok, so what the function outputs, wil also be the result of the 'refProducer'
and the function we pass in, will be executed. But what does the function
receive as input? Lets investigate

```javascript
console.log(refProducer(f => "a, " + String(f)));
// a, f => "a, " + String(f)
```

Ok, that's weird. We get "a, " but also our own function back. Our function just
received itself? What would happen if we would execute that function?

```javascript
const x = f => "a, " + f("b");
console.log(refProducer(x));
// TypeError: f is not a function
```

What happens is: Our function `x` got executed with `f`. but in `x`, `f` gets
executed with `"b"` But in that call the string `"b"` is tried to be called with
`"b"` again, and that breaks. So we can only call the received `f` with another
function.

So my guess is, this `x => x(x)` will allow us to trigger a recursion. Let's try
to build a fibonacci number calculator with this mechanic:

```javascript
const fibonacci = amount => refProducer(f => `n${amount}, ${f}`);
console.log(fibonacci(6));
// n6, f => `n${amount}, ${f}`
```

Ok we still didn't execute the provided argument, so this is basically the same
as the `a, f => "a, " + String(f)` response we got earlier.

Lets try to execute it with our `fibonacci2` function:

```javascript
const fibonacci2 = fibonacci => n =>
  n < 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2);

const fibonacciRecursive = fibonacci => amount =>
  refProducer(f => `n${amount}, ${f}, ${fibonacci(amount)}`);

console.log(fibonacciRecursive(fibonacci2)(6));
// n6, f => `n${amount}, ${f}, ${fibonacci(amount)}`, n =>
//  n < 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2)
```

We provided the fibonacci2 method into our recursive function. And we see its
contents in the output. Lets try to call this function with a callback, and
output the argument it supplies.

```javascript
const fibonacciRecursive = fibonacci => amount =>
  refProducer(
    f =>
      `n${amount}, ${f}, ${fibonacci(nextAmount => console.log(nextAmount))(
        amount
      )}`
  );
console.log(fibonacciRecursive(fibonacci2)(6));
// 5
// 4
// n6, f =>
//      `n${amount}, ${f}, ${fibonacci(nextAmount => console.log(nextAmount))(
//        amount
//      )}`, NaN
```

This output is actually pretty instresting. The input argument is '6'. The
outputs are 5 and 4, the nested calls respecively. The result of both calls
added resulted in an `NaN` since we where adding `undefined + undefined` (the
result of a `console.log`). It seems we are on the right track to make this
thing work.

Instead of logging the `nextAmount`, lets wrap our own function again and pass
this `nextAmount` through:

```javascript
const fibonacciRecursive = fibonacci => amount =>
  refProducer(
    f =>
      `n${amount}, ${f}, ${fibonacci(nextAmount => f(f)(nextAmount))(amount)}`
  );
console.log(fibonacciRecursive(fibonacci2)(6));
// RangeError: Maximum call stack size exceeded
```

Since our main function is now producing a string, it will never match with our
`n <= 2` conditoin to stop the recursoin. Furthermore, the `amount` passed in is
locked in the implementation, keeping the nested calls for each iteration
actually on `6`, even if the nextAmount is being lowered. Lets remove explicit
amount and let `currying` do its work for us:

```javascript
const fibonacciRecursive = fibonacci =>
  refProducer(f => fibonacci(nextAmount => f(f)(nextAmount)));
console.log(fibonacciRecursive(fibonacci2)(6)); // 13
```

nice! lets try it with another recursive function, the factorial. a factorial
will multiply itself with `n - 1`. resulting in:

```javascript
factorial(1); // 1 = 1
factorial(2); // 1 * 2 = 2
factorial(3); // 1 * 2 * 3 = 6
factorial(4); // 1 * 2 * 3 * 4 = 24
```

This is the implementation, receiving an `f` for the recursive calls:

```javascript
const factorial = f => n => (n === 0 ? 1 : n * f(n - 1));
console.log(fibonacciRecursive(factorial)(1)); // 1
console.log(fibonacciRecursive(factorial)(2)); // 2
console.log(fibonacciRecursive(factorial)(3)); // 6
console.log(fibonacciRecursive(factorial)(4)); // 24
console.log(fibonacciRecursive(factorial)(5)); // 120
```

You can see the `fibonacciRecursive` is actually not limited to calculating
fibonacci. You can create all kinds of recursive constructions with it. Lets
refactor it for a more general purpose:

```javascript
const refProducer = ref => ref(ref);

const fibonacciRecursive = fibonacci =>
  refProducer(f => fibonacci(nextAmount => f(f)(nextAmount)));
```

By renaming the passed in function to `f`, and the internal `f` to `y`:

```javascript
const refProducer = ref => ref(ref);

const fibonacciRecursive = f =>
  refProducer(y => f(nextAmount => y(y)(nextAmount)));
```

And embed our ref producer:

```javascript
const fibonacciRecursive = f =>
  (ref => ref(ref))(y => f(nextAmount => y(y)(nextAmount)));
```

And now rename `ref` to `x`, and `nextAmount` to `x` since it a different scope:

```javascript
const fibonacciRecursive = f => (x => x(x))(y => f(x => y(y)(x)));
```

And there it is, our "Y-combinator".

Time to put it in our JSON implementation. Lets start with the reducers

Before:

```javascript
const doReduce = reducer => start => ([head, ...tail]) =>
  head ? doReduce(reducer)(reducer(start)(head))(tail) : start;

const reduce = reducer => ([head, ...tail]) => doReduce(reducer)(head)(tail);
const reduceStart = reducer => start => tail => doReduce(reducer)(start)(tail);

console.log(reduce(r => e => r + e)([1, 2, 3, 4])); // 10
console.log(reduceStart(r => e => r + e)(5)([1, 2, 3, 4])); // 15
```

Introduce the 'internal' `doReduce` as 'f':

```javascript
const Y = f => (x => x(x))(y => f(x => y(y)(x)));

const doReduce = f => reducer => start => ([head, ...tail]) =>
  head ? f(reducer)(reducer(start)(head))(tail) : start;

const reduce = reducer => ([head, ...tail]) => Y(doReduce)(reducer)(head)(tail);
const reduceStart = reducer => start => tail =>
  Y(doReduce)(reducer)(start)(tail);
```

Since the 'reducer' does not change between calls, we can take it out from the
wrapping:

```javascript
const Y = f => (x => x(x))(y => f(x => y(y)(x)));

const doReduce = reducer => f => start => ([head, ...tail]) =>
  head ? f(reducer(start)(head))(tail) : start;

const reduce = reducer => ([head, ...tail]) => Y(doReduce(reducer))(head)(tail);
const reduceStart = reducer => start => tail =>
  Y(doReduce(reducer))(start)(tail);
```

And because of currying, we can simplify the `reduceStart`

```javascript
const Y = f => (x => x(x))(y => f(x => y(y)(x)));

const doReduce = reducer => f => start => ([head, ...tail]) =>
  head ? f(reducer(start)(head))(tail) : start;

const reduce = reducer => ([head, ...tail]) => Y(doReduce(reducer))(head)(tail);
const reduceStart = reducer => Y(doReduce(reducer));
```

When making these adjustments, we need to update other functions that use the
`doReduce` as well, such as `get` and `getObject`.

The `map` function:

```javascript
const map = transform =>
  Y(f => ([head, ...tail]) => (head ? [transform(head), ...f(tail)] : []));
```

The `many` function:

```javascript
const many = parser =>
  Y(f => stream =>
    orElse(toList(andThen(parser)(f)))(resultParser([]))(stream)
  );
```

Well that solved the "Recursion using self reference".

I thought this was the really complex stuff. Learning the mechanic behind the
Y-Combinator was pretty hard, but at least applying it was actually pretty
simple.

## Fixing the forward reference

Somehow I had real trouble replacing the forward reference. I thought, if it
would be possible to do something smart for recursion, it would certainly be
possible to rewrite the forward reference with some smart functions. I spent
hours and hours trying, but nothing worked. The next morning I finally realized
I was doing it wrong. It was not able to fix the forward reference, because the
forward reference itself was wrong.

Lets look at that code again:

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

This is what wrong. The whole idea of FP, is no side-effects. If you would call
a function with an argument today, it should give the same result when you would
call the function with the same argument tomorrow. And the forward reference
construction was breaking that.

Instead I should just delete the forward reference code, and check where the
problem really was. This was the first line to throw an error. The `valueParser`
was no longer defined.

```javascript
const arrayValue = ignoreTrailingSpaces(valueParser);
const arrayValues = sepBy(arraySep)(arrayValue);
const arrayParser = addLabel("array")(
  between(arrayStart)(arrayEnd)(arrayValues)
);
```

Instead of defining it, I just postponed defining it by wrapping it in a
function and push the value parser in:

```javascript
const arrayValue = valueParser => ignoreTrailingSpaces(valueParser);
const arrayValues = valueParser => sepBy(arraySep)(arrayValue(valueParser));
const arrayParser = valueParser =>
  addLabel("array")(between(arrayStart)(arrayEnd)(arrayValues(valueParser)));
```

Now the same for object. Just pushing the problem into the future.

```javascript
const objectValue = valueParser => ignoreTrailingSpaces(valueParser);
const objectKeyValue = valueParser =>
  andThen(andThenLeft(objectKey)(objectKeyValSep))(objectValue(valueParser));
const objectParser = valueParser =>
  mapResult(toObject)(
    between(objectStart)(objectEnd)(
      sepBy(objectPairSep)(objectKeyValue(valueParser))
    )
  );
```

And now for the value parser itself:

```javascript
const valueParser = Y(f =>
  choice([
    nullParser,
    boolParser,
    numberParser,
    quotedStringParser,
    arrayParser(f),
    objectParser(f)
  ])
);
```

In the end, this solution was really, really easy. I was just trying to fix the
wrong problem. By using currying I could just push the problem forward until all
the ingredients were at the right place.

## Conclusion
