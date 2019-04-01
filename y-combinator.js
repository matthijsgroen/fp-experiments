const fibonacci = n => (n < 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2));

//console.log(fibonacci(1)); // 1
//console.log(fibonacci(2)); // 2
//console.log(fibonacci(3)); // 3
//console.log(fibonacci(4)); // 5
//console.log(fibonacci(5)); // 8
//console.log(fibonacci(6)); // 13

// lets pass in fibonacci, so that it doesn't reference the global one
const fibonacci2 = fibonacci => n =>
  n < 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2);

//console.log(fibonacci2(fibonacci2)(1)); // 1
//console.log(fibonacci2(fibonacci2)(6)); // ouch, the sub calls don't know the
// change in signature, so we get the function itself concatenated

const refProducer = ref => ref(ref);

//console.log(refProducer(() => "a ")); // a, f => "a, " + String(f)
//console.log(refProducer(f => "a, " + String(f))); // a, f => "a, " + String(f)
//console.log(refProducer(f => "a, " + f("b"))); // TypeError: f is not a function

const fibonacciRecursive = amount => refProducer(f => `n${amount}, ${f}`);
//console.log(fibonacciRecursive(6));

const fibonacciRecursive2 = fibonacci => amount =>
  refProducer(f => `n${amount}, ${f}, ${fibonacci(amount)}`);
//console.log(fibonacciRecursive2(fibonacci2)(6));

const fibonacciRecursive3 = fibonacci => amount =>
  refProducer(
    f =>
      `n${amount}, ${f}, ${fibonacci(nextAmount => console.log(nextAmount))(
        amount
      )}`
  );
console.log(fibonacciRecursive3(fibonacci2)(6));

/*
const fibonacciRecursive4 = fibonacci => amount =>
  refProducer(
    f =>
      `n${amount}, ${f}, ${fibonacci(nextAmount => f(f)(nextAmount))(amount)}`
  );
console.log(fibonacciRecursive4(fibonacci2)(6));
// Max call stack, no one is stopping the recursion
*/

const fibonacciRecursive5 = fibonacci =>
  refProducer(f => fibonacci(nextAmount => f(f)(nextAmount)));
console.log(fibonacciRecursive5(fibonacci2)(6)); // works again!

const factorial = f => n => (n === 0 ? 1 : n * f(n - 1));

console.log(fibonacciRecursive5(factorial)(1)); // 1
console.log(fibonacciRecursive5(factorial)(2)); // 2
console.log(fibonacciRecursive5(factorial)(3)); // 6
console.log(fibonacciRecursive5(factorial)(4)); // 24
console.log(fibonacciRecursive5(factorial)(5)); // 120

const Y = f => (x => x(x))(y => f(x => y(y)(x)));
console.log(Y(factorial)(5)); // 120
console.log(Y(fibonacci2)(6)); // 13
/* */
