module.exports = (() => {
  const accumulator = Symbol('private property: accumulator');
  const push = Symbol('private method: push');

  return class ErrorAccumulator {
    constructor() {
      this[accumulator] = [];
    }

    [push](e) {
      this[accumulator].push(e);
    }

    add(obj) {
      if (obj instanceof Error) {
        this[push](obj);
      } else if (obj instanceof ErrorAccumulator) {
        obj.errors().map((e) => this[push](e));
      }
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

      const acc = this[accumulator].reduce((errorArray, e) => {
        // name
        errorArray.names.push(e.name);
        // message
        const message = e.message ? e.message : null;
        errorArray.messages.push(message);
        // stack
        /* istanbul ignore next */
        errorArray.stacks.push(e.stacks ? e.stack : `${e.name}: ${message}\n  no stack\n`);
        return errorArray;
      }, { names: [], messages: [], stacks: [] });

      const error = new Error();
      error.name = JSON.stringify(acc.names);
      error.message = JSON.stringify(acc.messages);
      error.stack = acc.stacks.join('\n');
      return error;
    }

    errors() {
      return this[accumulator].slice();
    }
  };
})();
