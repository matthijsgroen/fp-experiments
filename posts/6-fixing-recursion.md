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
const fibonacciRecursive = amount => refProducer(f => `n${amount}, ${f}`);
console.log(fibonacciRecursive(6));
// n6, f => `n${amount}, ${f}`
```

Ok we still didn't execute this `f` thing, so this is basically the same as the
`a, f => "a, " + String(f)` response we got earlier
