const stringify = (obj) => ((typeof obj === 'string') ? obj : JSON.stringify(obj));
const isEmpty = (obj) => ((typeof obj === 'object') && (Object.keys(obj).length === 0));
const isError = (e) => ((e.message) && (typeof e.message === 'string') && (e.stack));
const isErrorAccmulator = (obj, Klass) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const prop in Klass.prototype) {
    if (!(prop in obj.constructor.prototype)) {
      return false;
    }
  }
  return true;
};

const stacktrace = (obj, inc) => {
  const name = `Error: ${stringify(obj)}\n`;
  const stack = new Error().stack; // eslint-disable-line prefer-destructuring
  const trace = stack.split('\n').slice(inc + 3);
  return name + (trace.join('\n'));
};

module.exports = function accmulator() {
  const accumulator = [];

  const pushError = (e) => {
    accumulator.push(e);
  };

  const pushObject = (obj, inc) => {
    const error = new Error();
    error.message = obj;
    error.stack = stacktrace(obj, inc + 1);
    pushError(error);
  };

  function ErrorAccmulator() {}

  ErrorAccmulator.prototype.add = function add(obj, inc = 0) {
    if (!obj) {
      return this;
    }
    if (isError(obj)) {
      pushError(obj);
      return this;
    }
    if (isErrorAccmulator(obj, ErrorAccmulator)) {
      obj.errors().map((e) => pushError(e));
      return this;
    }
    if (obj instanceof Array) {
      obj.map((o) => this.add(o, inc + 3));
      return this;
    }
    if (isEmpty(obj)) {
      return this;
    }
    pushObject(obj, inc);
    return this;
  };

  ErrorAccmulator.prototype.has = function has() {
    return (accumulator.length > 0);
  };

  ErrorAccmulator.prototype.try = function tryThrow() {
    if (this.has()) {
      throw this.error();
    }
    return this;
  };

  ErrorAccmulator.prototype.error = function error() {
    if (!this.has()) {
      return null;
    }
    const err = new Error();
    err.message = JSON.stringify(accumulator.map((e) => e.message));
    err.stack = accumulator.map((e) => e.stack).join('\n');
    return err;
  };

  ErrorAccmulator.prototype.errors = function errors() {
    return accumulator.slice();
  };

  return new ErrorAccmulator();
};
