import { parseJSON, get } from "./jsonParser";

const data = `
{
  "name": "Functional programming challenge",
  "goal": [
    "create a function that takes one argument that is a path into this JSON struct",
    "get(data)(\\"using.disallowed.0\\") should result in \\"Dependencies\\"",
    "get(data)(\\"points.full-json\\") should result in 1000",
    "get(data)(\\"jsonTypes.2\\") should result in false"
  ],
  "using": {
    "allowed": [
      "Only code in this file",
      "Only functions that take one argument",
      "Ternary operator true ? a : b"
    ],
    "disallowed": [
      "Dependencies",
      "Recursion to own function",
      "JSON.parse",
      "Usage of 'if'",
      "Usage of for/while loops",
      "Usage of functions before they are defined",
      "Host object functions (.split, .map, .reduce, etc)",
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

const jsonStruct = parseJSON(data);

console.log(jsonStruct);
console.log(get(jsonStruct)("using.disallowed.0"));

// const example =
//   '   ["hello, \\n \\"world\\"", { "foo": "var" }, null, true, [false]]';
// console.log(parseJSON(example));
