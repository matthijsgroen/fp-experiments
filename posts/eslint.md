# Playing around with ESLint

For the functional programming challenge I created for myself, I wanted to

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "message": "Please use the lambda () => notation"
      }
    ]
  }
}
```

restrict myself from cheating and forcing myself to a particular syntax. To do
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
attributes). Following this same concept, you can target specific elements in
this tree using a selector (just like in CSS!)

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
        "message": "Missing error reporting in catch block"
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
        "message": "First argument of selector should be called state"
      }
    ]
  }
}
```

ESLint has a lot of great rules out of the box, but the `no-restricted-syntax`
takes the linting to a whole new level.

There are some things you cannot do however. I wanted to create a rule to
restrict self referencing recursion. But since I needed the identifier to match,
you cannot use placeholders to match it.

I had to create a custom ESLint plugin for this. Fortunately, creating one is
really easy, using [yeoman](https://yeoman.io)

and [the generator created here](https://github.com/eslint/generator-eslint).

Its mainly a "follow the instructions" exercise. There were 2 pitfalls I ran
into:

One was specifying a parser for my rules, because the default parser is ES3, and
not a modern JS parser.

So my generated test looked like this:

```javascript
ruleTester.run("fp-challenge", rule, {
  invalid: [
    {
      code: "const fib = n => n <= 1 ? 1 : fib(n - 1) + fib(n - 2);"
    }
  ]
});
```

And I needed to add parser options to that test:

```javascript
ruleTester.run("fp-challenge", rule, {
  invalid: [
    {
      code: "const fib = n => n <= 1 ? 1 : fib(n - 1) + fib(n - 2);",
      parserOptions: { ecmaVersion: 6 }
    }
  ]
});
```

Before I got the proper error message.

The other pitfall is if you want the user to allow specifying options for your
rule. You need to provide a JSON schema to allow valdiation for these options.
But the problem is, you need to restart the tests before the provided JSON
schema is reparsed. So if you run the tests using `yarn test --watch` you keep
wondering why tests keep failing or keep passing, and not pick up the changes
you made to the schema.

I found the
[Understanding JSON schema](https://json-schema.org/understanding-json-schema/index.html)
helpful in the defintion of a schema. The
[main website](https://json-schema.org/) is confusing to find the right info.

Having a proper ESlint configuration helps in enforcing best practices of your
team, and even leave helpful hints to other members just joining your team. It
can help capture the spirit of development within the project itself.

Happy linting!
