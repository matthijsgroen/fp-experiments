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

ESLint has a lot of great rules out of the box, but the `no-restricted-syntax`
takes the linting to a whole new level...
