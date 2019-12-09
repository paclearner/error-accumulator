# error-accumulator

An accumulator for errors that tries to interrupt and throw an error if the storage is not empty.

This accumulator can be used for a synchronous validation chain.
Such a validation chain is to validate something at first, try to do the next validation if the first validation success, and next to next.
If a validation failed, the validation chain will interrupt at the time.
This accumulator help to implement such a validation chain.

The accumulator has an internal array, and the method `add` tries to push an `Error`, `Error`s, a string, an array, an object or this accumulator to the array.
If the input for `add` is not a [**truthy**](https://developer.mozilla.org/en-US/docs/Glossary/truthy) value or one of a value in the following table, the accumulator does **not** to push it to the internal storage and the storage still remains the same before `add`:

* `{}`: empty object
* `[]`: empty array

The return value of `add` is the accumulator itself.

The method `try` throws an error if the storage is not empty.
If the storage is empty, nothing is thrown and the return valud of `try` is the accumulator itself.

## Usage

```js
const ErrorAccumulator = require('error-accumulator');
const acc = new ErrorAccumulator();

try {
  acc
    .add(v1()) // v1() returns an Error (fail), undefined or null (success)
    .add(v2()) // v2() returns an not empty object (fail) or {} (success)
    .add(v3()) // v2() returns an not empty array (fail) or [] (success)
    .try()     // If v1, v2 or v3 failed, throw a error
    .add(v4()) // v4() returns a non-zero number (fail) or 0 (success)
    .add(v5()) // v5() returns a not empty string (fail) or '' (success)
    .try();    // If v4 or v5 failed, throw an error
  // All the validation success
  acc.has(); // false
  acc.error(); // null
  acc.errors(); // An empty array []
} cathc (e) {
  console.log(e); // An Error instace created from all the error
  console.log(e.message); // A concatenation string of all message
  console.log(e.stack); // A concatination string of all stack

  console.log(acc.has()); // return true
  console.log(acc.error()); // return 'e'
  console.log(acc.errors()); // return an array of the errors
}

const anotherAcc = new ErrorAccumulator();
anotherAcc.add(acc); // append all errors of acc to anotherAcc
```

### `.error`

The type of `.error()` is `Error` such that:

* `.message`: a string to concatenate all error message in `JSON.stringify`
* `.stack`: a string to concatinate all error stack.

**Note** that `.stack` holds all the stacktrace at the `add` position or an `.stack` of `Error` instance.

```js
/* index.test.js */
'use strict';
const ErrorAccumulator = require('error-accumulator');

const acc = new ErrorAccumulator();
acc
  .add(true) // line 7.
  .add(5150)
  .add('string test')
  .add(['array0', 'array1'])
  .add({ objectKey: 'objectVal' })
  .add(new Error('Error test')); // line 12.
console.log(acc.error().stack);
/*
Error: true
    at Object.<anonymous> (/path/to/test/index.test.js:7:4)
    at Module._compile (internal/modules/cjs/loader.js:956:30)
    ...
    at Function.Module.runMain (internal/modules/cjs/loader.js:1025:10)
    at internal/main/run_main_module.js:17:11
Error: 5150
    at Object.<anonymous> (/path/to/test/index.test.js:8:4)
    at Module._compile (internal/modules/cjs/loader.js:956:30)
    ...
    at Function.Module.runMain (internal/modules/cjs/loader.js:1025:10)
    at internal/main/run_main_module.js:17:11
Error: string test
    at Object.<anonymous> (/path/to/test/index.test.js:9:4)
    at Module._compile (internal/modules/cjs/loader.js:956:30)
    ...
    at Function.Module.runMain (internal/modules/cjs/loader.js:1025:10)
    at internal/main/run_main_module.js:17:11
Error: array0
    at Object.<anonymous> (/path/to/test/index.test.js:10:4)
    at Module._compile (internal/modules/cjs/loader.js:956:30)
    ...
    at Function.Module.runMain (internal/modules/cjs/loader.js:1025:10)
    at internal/main/run_main_module.js:17:11
Error: array1
    at Object.<anonymous> (/path/to/test/index.test.js:10:4)
    at Module._compile (internal/modules/cjs/loader.js:956:30)
    ...
    at Function.Module.runMain (internal/modules/cjs/loader.js:1025:10)
    at internal/main/run_main_module.js:17:11
Error: {"objectKey":"objectVal"}
    at Object.<anonymous> (/path/to/test/index.test.js:11:4)
    at Module._compile (internal/modules/cjs/loader.js:956:30)
    ...
    at Function.Module.runMain (internal/modules/cjs/loader.js:1025:10)
    at internal/main/run_main_module.js:17:11
Error: Error test
    at Object.<anonymous> (/path/to/test/index.test.js:12:8)
    at Module._compile (internal/modules/cjs/loader.js:956:30)
    ...
    at Function.Module.runMain (internal/modules/cjs/loader.js:1025:10)
    at internal/main/run_main_module.js:17:11
*/
```

### `.errors`

The type of `.errors()` is a `Array`, and the element is an instance of `Error`.
The element is quite **different** from the `Error` instance of `.error`.
The `message` property of each `.errors()` element holds **the original input value**.
**Note** that if the input for `add` is a `Array` or an instance of `ErrorAccumulator`, the input will be flatten and the each element will add to the storage individually.

```js
const ErrorAccumulator = require('error-accumulator');

const acc = new ErrorAccumulator();
acc
  .add(true)
  .add(5150)
  .add('string test')
  .add(['array0', 'array1'])
  .add({ objectKey: 'objectVal' })
  .add(new Error('Error test'));
acc.errors().map((e) => console.dir(e.message));
/*
[
  true,
  5150,
  'string test',
  'array0',
  'array1',
  { objectKey: 'objectVal' },
  'Error test'
]
*/
```

## License

[MIT](LICENSE)
