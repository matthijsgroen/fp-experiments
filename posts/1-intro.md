# My journey in learning Functional Programming

Hi I'm Matthijs Groen, Frond-end developer at Kabisa, and I would like to share
my experiences with diving into the concepts of Functional Programming. Before
we dive into the Functional Programming (FP) goodness, I'd like to share where I
was coming from, and why I had so much trouble adjusting to the FP concepts.

I spend most of my developer life writing Object Oriented code, and even some
procedural code before that. In Object oriented programming (at least how I was
taught) How you name objects, methods etc. mattered.

I have worked with Ruby on Rails for years. Not only was everything an object in
that language, Rails itself is a framework with "conventions". These conventions
make you productive in some cases, but also make you feel trapped in others.

```ruby
3.times do
  puts "This will be printed 3 times"
end
```

> Yes, even a number is an object.

After working with Ruby (doing full-stack), my work changed to be more frontend
only. We used Backbone.js for years. Backbone, just like Ruby on Rails is Object
Oriented, and follows the Model-View-Controller pattern.

A few years ago we changed the frontend stack from Backbone.js (in combination
with Coffeescript) to Preact, Redux and modern EcmaScript.

The thing I liked most when I just switched from Backbone.js to Preact was the
way you could nest views. In Backbone this really was a pain. So you would end
up with big templates. In Preact, you make a small reusable Component from
everything, and nesting views was actually _the_ way to build up your UI.

It also changed for us where logic lived.

The location of logic was no longer decided by the framework. You could put it
everywhere. This made the business logic totally separate and on its own. Easier
to test, in loose small functions. No framework to have any opinion about it.
Data in, data out. Just functions, and functions calling other functions.

No hidden dependencies, or object hierarchies.

It makes refactoring or moving code around a breeze. Now not only the views
where composable, the whole software became composable.

```jsx
<HeaderBar theme={"blue"}>
  <SiteMenu />
  <UserProfile user={user} />
</HeaderBar>
```

> Nesting views (Components) in Preact is as easy as nesting HTML self.

## First steps...

I really started to like this approach. I got more colleagues on my team that
**really** were into functional programming. Elixir, Haskell, Monoids, Functors,
Category theory. I didn't understand half of what they were saying. And when I
asked to explain stuff to me, most of the time it only gave me headaches...

But I really started to like working with functions only approach. No
`getName()` that could reply with a different value each time you called it. It
became more predictable. Also working with Redux brought new concepts to the
table. Those of immutability. Not changing data, but reconstructing new data
based on changes.

### An example:

Before:

```javascript
class Person {
  constructor(firstName, lastName, age) {
    super
    this.firstName = firstName;
    this.lastName = lastName;
    this.age = age;
  }

  getName() { return `${this.firstName} ${this.lastName}`; }
  getAge() { return this.age; }
  increaseAge(amount) { this.age += amount; }
}

const me = new Person("Matthijs", "Groen", 37);
me.getAge(); // 37
me.increaseAge(1);
me.getAge(); // 38
me.getName(); // Matthijs Groen
```

After:

```javascript
const me = {
  firstName: "Matthijs",
  lastName: "Groen",
  age: 37
};

const getName = person => `${person.firstName} ${person.lastName}`;
const getAge = person => person.age;
const increaseAge = (person, amount) => ({
  ...person,
  age: person.age + amount
});

getAge(me); // 37
const olderMe = increaseAge(me, 1);
getAge(me); // still 37!
getAge(olderMe); // 38!
getName(me); // Matthijs Groen
```

There are more benefits:

- Since a function only relies on its directly provided input, and is not
  allowed to change that input, not handling the result would actually make the
  function call as if it never happened.
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
["Functors, applicatives and monads in pictures"](http://adit.io/posts/2013-04-17-functors,_applicatives,_and_monads_in_pictures.html)
I only started to make sense from it by opening the browser console and started
typing JavaScript to try to follow along.

> [Opening the browser developer console](https://support.monday.com/hc/en-us/articles/360002197259-How-to-Open-the-Developer-Console-in-your-Browser)
> for this series is also a great way to follow along what I am building 🙂

I could replicate the concepts, but I did not understand them, or how it would
help me write better software.

I was intrigued by
[a video about Parser Combinators](https://www.youtube.com/watch?v=RDalzi7mhdY)
by Scott Wlaschin, because I work and create DSLs in various projects. It looked
like fun to build something like that for myself.

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
 * no function usage of the host language, no dependencies
 *
 * import get from "lodash/get";
 *
 * const ast = JSON.parse(data);
 * const get = ast => path => get(ast, path)
 * console.log(get(ast)("using.disallowed.0"));
 *
 */
```

Would I be able to create purely functional code to parse the JSON defined?

Yes, I even added a `Recursion to own function` in there, after watching
["The next great functional programming language"](https://www.youtube.com/watch?v=buQNgW-voAg)
just to see if it would really be possible.

> In this talk, John de Goes argues that a good programming language could do
> without:
>
> Pattern matching, Records, Modules, Syntax, Type classes, Nominative typing,
> Data, Recursion

<https://www.slideshare.net/jdegoes/the-next-great-functional-programming-language>
(see slide 11 for the list)

Having the blogpost of Parser Combinators ready at hand, it would be a simple
exercise of following along and implementing it in Javascript, and trying to
apply a few more rules along the way. (I was wrong!)

I never knew I would learn so much in a few days...

In the upcoming posts I would like to take you along the journey I made into
Functional Programming. This posts deliberately ends here, so if you would like
to do the challenge yourself, you can do so without spoilers.
