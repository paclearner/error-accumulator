const Blob = require('node-blob');

const ErrorAccumulator = require('../index');

describe('error-accumulator', () => {
  class UserError extends Error {
    constructor(message) {
      super(message);
      this.name = 'UserError';
    }
  }

  const a = { b: {} };

  describe('README', () => {
    test('example', () => {
      const acc = new ErrorAccumulator();
      expect(() => {
        /* eslint-disable quotes */
        /* eslint-disable no-multi-spaces */
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
          .try(); // throw an error
        /* eslint-enable no-multi-spaces */
        /* eslint-enable quotes */
      }).toThrow(new Error(JSON.stringify(
        [
          'false',
          'null or undefined',
          'NaN or 0',
          'empty',
          'Cannot read property \'c\'',
        ],
      )));
      expect(acc.error().name).toEqual(JSON.stringify(
        [
          'Error',
          'TypeError',
          'EvalError',
          'SyntaxError',
          'UserError',
        ],
      ));
      const errors = acc.errors();
      expect(errors[0]).toBeInstanceOf(Error);
      expect(errors[1]).toBeInstanceOf(TypeError);
      expect(errors[2]).toBeInstanceOf(EvalError);
      expect(errors[3]).toBeInstanceOf(SyntaxError);
      expect(errors[4]).toBeInstanceOf(UserError);
    });

    test('methods', () => {
      const x = new ErrorAccumulator();
      x.add(new Error('built-in Error'));
      x.add(new EvalError('built-in EvalError'));

      const y = new ErrorAccumulator();
      y.add(new RangeError('built-in RangeError'));
      y.add(new ReferenceError('built-in ReferenceError'));

      const errors = x.add(y).errors();
      expect(errors[0]).toBeInstanceOf(Error);
      expect(errors[1]).toBeInstanceOf(EvalError);
      expect(errors[2]).toBeInstanceOf(RangeError); // true
      expect(errors[3]).toBeInstanceOf(ReferenceError); // true

      expect((new ErrorAccumulator())
        .add(new Error())
        .add(new EvalError())
        .add(new RangeError())
        .add(new ReferenceError())
        .add(new SyntaxError())
        .add(new TypeError())
        .add(new UserError())
        .errors().length).toEqual(7);
    });
  });

  describe('add', () => {
    test('should not throw an exception', () => {
      const acc = new ErrorAccumulator();
      expect(() => {
        acc
          .add(true)
          .add(false)
          .try()
          .add(null)
          .add(undefined)
          .try()
          .add(0)
          .add(NaN)
          .add(-1)
          .try()
          .add('')
          .add('not empty string')
          .try()
          .add(a.b)
          .add({})
          .add([])
          .add(function func() {}) // eslint-disable-line prefer-arrow-callback
          .add(() => {})
          .try()
          .add(/RegExp/)
          .add(Symbol('symbol'))
          .add(new Blob('blb', { type: 'blob/error' }))
          .add(new Date())
          .try();
      }).not.toThrow();

      expect(acc.error()).toBeNull();
      expect(acc.errors()).toEqual([]);
    });

    test('should throw built-in errors', () => {
      expect(() => {
        (new ErrorAccumulator())
          .add(new Error('built-in Error'))
          .add(new EvalError('built-in EvalError'))
          .add(new RangeError('built-in RangeError'))
          .add(new ReferenceError('built-in ReferenceError'))
          .add(new SyntaxError('built-in SyntaxError'))
          .add(new TypeError('built-in TypeError'))
          .add(new UserError('built-in UserError'))
          .try();
      }).toThrow(new Error(JSON.stringify(
        [
          'built-in Error',
          'built-in EvalError',
          'built-in RangeError',
          'built-in ReferenceError',
          'built-in SyntaxError',
          'built-in TypeError',
          'built-in UserError',
        ],
      )));
    });
  });

  describe('error', () => {
    test('should merge the two instaces sequentially', () => {
      const accA = new ErrorAccumulator();
      const accB = new ErrorAccumulator();
      accA.add(new Error('A1'));
      accB.add(new Error('B1'));
      accA.add(new Error('A2'));
      accB.add(new Error('B2'));
      accA.add(accB);

      expect(accA.errors().map((e) => e.name))
        .toEqual(['Error', 'Error', 'Error', 'Error']);
      expect(accA.errors().map((e) => e.message))
        .toEqual(['A1', 'A2', 'B1', 'B2']);
    });

    [
      {
        test: 'should throw an error without name',
        error: () => {
          const e = new Error('WithoutName');
          delete e.name; // but e.name is 'Error'.
          return e;
        },
        expected: {
          message: /^\["WithoutName"\]/,
          stack: /^Error: WithoutName\n/,
          pullback: ['WithoutName'],
        },
      },
      {
        test: 'should throw an error without message',
        error: () => {
          const e = new Error('WithoutMessage');
          delete e.message;
          return e;
        },
        expected: {
          message: /^\[null\]$/,
          stack: /^Error: null\n/,
          pullback: [null],
        },
      },
      {
        test: 'should throw an error without stack',
        error: () => {
          const e = new Error('WithoutStack');
          delete e.stack;
          return e;
        },
        expected: {
          message: /^\["WithoutStack"\]/,
          stack: /^Error: WithoutStack\n[ ]{2}no stack\n$/,
          pullback: ['WithoutStack'],
        },
      },
      {
        test: 'should throw an error with an object message',
        error: () => {
          const e = new Error('WithoutStringMessage');
          e.message = { prop: 'this is not string' };
          return e;
        },
        expected: {
          message: /^\[{"prop":"this is not string"}\]$/,
          stack: /^Error: /,
          pullback: [{ prop: 'this is not string' }],
        },
      },
      {
        test: 'should throw an error without stack and message',
        error: () => {
          const e = new Error('WithoutStackAndMessage');
          delete e.message;
          delete e.stack;
          return e;
        },
        expected: {
          name: 'Error: WithoutStackAndMessage',
          message: /^\[null\]$/,
          stack: /^Error: null\n[ ]{2}no stack\n$/,
          pullback: [null],
        },
      },
    ].forEach((c) => {
      test(`${c.test}`, () => {
        const e = (new ErrorAccumulator()).add(c.error()).error();
        expect(e.name).toEqual('["Error"]');
        expect(e.message).toMatch(c.expected.message);
        expect(e.stack).toMatch(c.expected.stack);
        expect(JSON.parse(e.message)).toEqual(c.expected.pullback);
      });
    });
  });
});
