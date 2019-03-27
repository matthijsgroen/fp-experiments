# Parsing arrays and numbers

This is a continuation of the Functional Programming challenge I gave myself:
Write a JSON parser in JavaScript, using
[the parser combinator principles from the blogpost of Scott Wlaschin](https://fsharpforfunandprofit.com/posts/understanding-parser-combinators/).

At this point, we are able to parse `null`, `true`, `false`, strings and
numbers. In this post we will complete the initial implementation by adding
support for arrays and objects.

In the previous post we rewrote the `.reduce` to use our own. To promote this
behavior, I wanted to get rid of all calls to 'objects'. So I added a new rule
to the ESLint config in my `package.json`:

```json
{
  "eslintConfig": {
    "rules": {
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.type=MemberExpression][callee.property.name!='log']",
          "message": "Not allowed to call object members, except console.log()"
        }
      ]
    }
  }
}
```

While this test for `console.log` is not fool proof, it will start warning about
`.map`, `.join` and `.concat`. So lets start rewriting them:

```javascript
// before
const toList = mapResult(result => [result[0]].concat(result[1]));
// after
const toList = mapResult(result => [...result[0], ...result[1]]);
```

That was not hard, since the spread operator (`...`) will concat the 2 lists for
us.

```javascript
// before
const toString = mapResult(result => result.join(""));
// after
const reduceStart = reducer => start => tail => doReduce(reducer)(start)(tail);
const join = a => b => String(a) + String(b);
const toString = mapResult(reduceStart(join)(""));
```

I created a `reduceStart` that is a variant of the already made `reduce` (see
previous post), but this time you can provide a start value for the result. This
is so that empty lists are converted to empty strings.

Considering we extracted 2 helper functions, the code of the `toString` is
actually a bit shorter!

```javascript
// before
const stringParser = string =>
  addLabel(string)(chain([...string].map(char => characterParser(char))));
// after
const map = transform => ([head, ...tail]) =>
  head ? [transform(head), ...map(transform)(tail)] : [];

const stringParser = string =>
  addLabel(string)(chain(map(characterParser)([...string])));
```

Here I made a `map` function, just like we created the `reduce` before (see
previous post). There are other functions using `.map` that I needed to convert:

```javascript
// before
const escapedCharParser = choice(
  specialCharacters.map(([match, result]) => parseStringResult(match)(result))
);

// after
const escapedCharParser = choice(
  map(([match, result]) => parseStringResult(match)(result))(specialCharacters)
);
```

Apart from the small change in order (transform before the list) the setup is
basically the same.

```javascript
// before
const anyOf = string => choice([...string].map(characterParser)([...string]));

// after
const anyOf = string => choice(map(characterParser)([...string]));
```
