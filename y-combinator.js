const fibonacci = n => (n < 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2));

console.log(fibonacci(1)); // 1
console.log(fibonacci(2)); // 2
console.log(fibonacci(3)); // 3
console.log(fibonacci(4)); // 5
console.log(fibonacci(5)); // 8
console.log(fibonacci(6)); // 13

// lets pass in fibonacci, so that it doesn't reference the global one
const fibonacci2 = fibonacci => n =>
  n < 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2);

console.log(fibonacci2(fibonacci2)(6)); // ouch, the sub calls don't know the
// change in signature, so we get the function itself concatenated

const callFibonacci = func => (fibonacci2 => fibonacci2(fibonacci2))(func);
console.log(callFibonacci(fibonacci2)(6)); // same

const callFibonacci2 = func =>
  (fibonacci2 => fibonacci2(fibonacci2))(f => func(f));
console.log(callFibonacci2(fibonacci2)(6)); // still same

const callFibonacci3 = func =>
  (fibonacci2 => fibonacci2(fibonacci2))(f => func(nested => f(f)(nested)));
console.log(callFibonacci3(fibonacci2)(6)); // works again!

const factorial = f => n => (n === 0 ? 1 : n * f(n - 1));

console.log(callFibonacci3(factorial)(1)); // 1
console.log(callFibonacci3(factorial)(2)); // 2
console.log(callFibonacci3(factorial)(3)); // 6
console.log(callFibonacci3(factorial)(4)); // 24
console.log(callFibonacci3(factorial)(5)); // 120

const Y = f => (x => x(x))(y => f(x => y(y)(x)));
console.log(Y(factorial)(5)); // 120
console.log(Y(fibonacci2)(6)); // 13
