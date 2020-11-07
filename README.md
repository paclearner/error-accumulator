# error-accumulator

An accumulator for only Error instances that tries to interrupt and throws an error if and only if the accumulator is not empty.

This accumulator can accumulate an instance of `Error` or accumulator itself but not any other object or value.
Therefore, the accumulator works well with [Short-circuit evaluation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_Operators#Short-circuit_evaluation).

This module provides the class `ErrorAccumulator` which has an internal array.
The method `add` pushes an input to the array if the input is an instance of `Error` or `ErrorAccmulator`.
If not, `add` ignores the input.
The return value of `add` is always `ErrrorAccmulator` itself.
The method `try` will throw an `Error` if the internal array is **NOT** empty.
If the array is empty, `try` returns `ErrorAccmulator` itself.

## Example

```js
const ErrorAccumulator = require('error-accumulator');

class UserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserError';
  }
}
const a = { b: {} };

const acc = new ErrorAccumulator();
try {
  acc
    .add(true     || new Error('not add'))
    .add(-1       || new Error('not add'))
    .add('string' || new Error('not add'))
    .add([]       || new Error('not add'))
    .add({}       || new Error('not add'))
    .add(a        || new Error('not add'))
    .add(a.b      || new Error('not add'))
    .try() // returns `acc`
    .add(false             || new Error('false'))
    .add(null || undefined || new TypeError('null or undefined'))
    .add(NaN || 0          || new EvalError('NaN or 0'))
    .add('' || "" || ``    || new SyntaxError('empty'))
    .add(a.b.c             || new UserError('Cannot read property \'c\''))
    .try(); // throws an error
} catch (e) {
  // `e` is a instace of `Error` that `ErrorAccmulator` creates.

  console.log(e.name);
  // a string serializing an array of all the error names:
  // ["Error","TypeError","EvalError","SyntaxError","UserError"]

  console.log(e.message);
  // a string serializing an array of all the error messages:
  // ["false","null or undefined","NaN or 0","empty","Cannot read property 'c'"]

  console.log(e.stack);
  // a concatenation of all the error stacks:
  // Error: false
  //     at Object.<anonymous> (/path/to/test/index.test.js:22:35)
  //     ...
  // TypeError: null or undefined
  //     at Object.<anonymous> (/path/to/test/index.test.js:23:35)
  //     ...
  // EvalError: NaN or 0
  //     at Object.<anonymous> (/path/to/test/index.test.js:24:35)
  //     ...
}

console.log(acc.has()); // true
console.log(acc.error()); // returns 'e'
console.log(acc.errors());
// returns an array of all the inputs pushed by `add()`:
// [
//   Error('false'),
//   TypeError('null or undefined'),
//   EvalError('NaN or 0'),
//   ...
//   UserError('Cannot read property \'c\'')
// ]

// add another accumulator to an accumulator:
const empty = new ErrorAccumulator();
const another = (new ErrorAccumulator())
  .add(new Error('0'))
  .add(new Error('1'))
  .add(new Error('2'));

acc
  .add(empty) // nothing to be added
  .add(another);
console.log(acc.error().message);
// ["false", "null or ... property 'c'","0","1","2"]
```

## Methods

### `.add(any)`

returns the accumulator instance itself.
If the input is an instance of

* `Error` or
* `ErrorAccumulator`,

`add()` pushes the input to the internal array.
If not, `add` ignores the input.

```js
class UserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserError';
  }
}

try {
 (new ErrorAccumulator())
  .add(new Error('built-in Error'))
  .add(new EvalError('built-in EvalError'))
  .add(new RangeError('built-in RangeError'))
  .add(new ReferenceError('built-in ReferenceError'))
  .add(new SyntaxError('built-in SyntaxError'))
  .add(new TypeError('built-in TypeError'))
  .add(new UserError('This is a UserError'))
  .try();
} catch (e) {
  console.error(e.name);
  // ["Error","EvalError",...,"UserError"]
  console.error(e.message);
  // ["built-in Error","built-in EvalError",...,"This is a UserError"]
}
```

If the type of the input is `ErrorAccmulator`, `add()` flats the all the errors of the input and push all the elements to the internal array individually.

```js
const a = new ErrorAccumulator();
const b = new ErrorAccumulator();
a.add(new Error('A1'));
b.add(new Error('B1'));
a.add(new Error('A2'));
b.add(new Error('B2'));

a.add(b);
console.error(a.error().message);
// ["A1","A2","B1","B2"]
```

### `.try()`

attempts to throw an error.
If the internal array is **NOT** empty, `try()` throws an error which `ErrorAccumulator` creates (See `.error()`).
If the internal array is empty, `try()` returns the accumulator instance itself.

```js
const acc = new ErrorAccumulator();
try {
  acc
    .add(true)
    .add(false)
    .try() // not thrown
    .add(null)
    .add(undefined)
    .try() // not thrown
    .add(0)
    .add(NaN)
    .add(-1)
    .try() // not thrown
    .add('')
    .add('not empty string')
    .try() // not thrown
    .add({})
    .add([])
    .add(function func() {})
    .add(() => {})
    .try() // not thrown
    .add(/RegExp/)
    .add(Symbol('symbol'))
    .add(new Blob('blb', { type: 'blob/error' }))
    .add(new Date())
    .try(); // not thrown
} catch (e) {
  // never reach here
  console.error(e.message);
}
console.log(acc.has()); // false
console.log(acc.error()); // null
console.log(acc.errors()); // []
```

### `.has()`

returns a boolean value indicating whether the internal array is empty or not.

### `.error()`

returns an `Error` instance if the internal array is not empty.
If the internal array is empty, `error()` returns `null`.

An `Error` instance which `error()` returns has the standard properties of [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) such that:

* `.name`: a string indicating an array of all the error names by `JSON.stringify`.
* `.message`: a string indicating an array of all the error messages by `JSON.stringify`.
* `.stack`: a string concatinating all the error stack.

### `.errors()`

returns an array of all the inputs pushed by `add()`.
Note that if an instance of `ErrorAccumulator` has been added, the elements of the instance is flatten.
If the internal array is empty, `errors()` returns an empty array `[]`.

```js
const a = new ErrorAccumulator();
console.log(a.errors()); // []
a.add(new Error());
a.add(new EvalError());

const b = new ErrorAccumulator();
b.add(new RangeError());
b.add(new ReferenceError());

const errors = a.add(b).errors();

console.log(errors[0] instanceof Error); // true
console.log(errors[1] instanceof EvalError); // true
console.log(errors[2] instanceof RangeError); // true
console.log(errors[3] instanceof ReferenceError); // true
```

## License

[MIT](LICENSE)
