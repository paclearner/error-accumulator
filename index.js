const {
  isArray,
  isPlainObject,
  isString,
} = require('is-what');

const isEmpty = (obj) => (isPlainObject(obj) && (Object.keys(obj).length === 0));

const stacktrace = (obj, inc) => {
  const e = new Error();
  /* istanbul ignore next */
  const trace = e.stack ? e.stack.split('\n').slice(inc + 3).join('\n') : '';
  const message = isString(obj) ? obj : JSON.stringify(obj);
  return `Error: ${message}\n${trace}`;
};

module.exports = (() => {
  const accumulator = Symbol('private property: accumulator');
  const pushError = Symbol('private method: pushError');
  const pushObject = Symbol('private method: pushObject');

  return class ErrorAccumulator {
    constructor() {
      this[accumulator] = [];
    }

    [pushError](e) {
      this[accumulator].push(e);
    }

    [pushObject](obj, inc) {
      const error = new Error();
      error.message = obj;
      error.stack = stacktrace(obj, inc + 1);
      this[pushError](error);
    }

    add(obj, inc = 0) {
      if (!obj) {
        return this;
      }
      if (obj instanceof Error) {
        this[pushError](obj);
        return this;
      }
      if (obj instanceof ErrorAccumulator) {
        obj.errors().map((e) => this[pushError](e));
        return this;
      }
      if (isArray(obj)) {
        obj.map((o) => this.add(o, inc + 3));
        return this;
      }
      if (isEmpty(obj)) {
        return this;
      }
      this[pushObject](obj, inc);
      return this;
    }

    has() {
      return (this[accumulator].length > 0);
    }

    try() {
      if (this.has()) {
        throw this.error();
      }
      return this;
    }

    error() {
      if (!this.has()) {
        return null;
      }
      const error = new Error();
      error.message = JSON.stringify(this[accumulator].map((e) => e.message));
      error.stack = this[accumulator].map((e) => e.stack).join('\n');
      return error;
    }

    errors() {
      return this[accumulator].slice();
    }
  };
})();
