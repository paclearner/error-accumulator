/* eslint-env mocha */
/* eslint-disable max-classes-per-file */
/* eslint no-eval: 0 */
const { expect } = require('chai');
const Blob = require('node-blob');
const path = require('path');

const ErrorAccumulator = require('../index');

describe('error-accumulator', () => {
  const requiredFileName = path.basename('../index.js');
  const thisFileName = path.basename(__filename);
  const thisFileNameRegExp = thisFileName.replace(/[.]/g, '[.]');

  const lineNumber = () => {
    const e = new Error();
    if (e.lineNumber) return lineNumber;
    if (!e.stack) return NaN;
    return parseInt(e.stack.split(`${thisFileName}:`)[2].match(/^(\d+)/)[1], 10);
  };

  class UserError extends Error {}

  const a = { b: {} };

  describe('err', () => {
    it('example (to be thrown)', () => {
      expect(() => {
        (new ErrorAccumulator())
          .err(false || null || undefined || new Error('false, null or undefined'))
          .err(NaN || 0 || new Error('NaN or 0'))
          .err('' || "" || `` || new Error('\'\', "" or ``')) // eslint-disable-line quotes
          .err(a.b.c || new Error('Cannot read property \'c\''))
          .try();
      }).to.throw(JSON.stringify(
        [
          'false, null or undefined',
          'NaN or 0',
          '\'\', "" or ``',
          'Cannot read property \'c\'',
        ],
      ));
    });

    it('example (not to be thrown)', () => {
      const acc = new ErrorAccumulator();
      expect(() => {
        acc
          .err(true)
          .err(false)
          .err(null)
          .err(undefined)
          .err(0)
          .err(NaN)
          .err(-1)
          .err('')
          .err('not empty string')
          .err(a.b)
          .err({})
          .err([])
          .err(function func() {}) // eslint-disable-line prefer-arrow-callback
          .err(() => {})
          .err(/RegExp/)
          .err(Symbol('symbol'))
          .err(new Blob('blb', { type: 'blob/error' }))
          .err(new Date())
          .try();
      }).to.not.throw();

      expect(acc.error()).to.be.null;
      expect(acc.errors()).to.deep.equal([]);
    });

    it('should throw built-in errors', () => {
      expect(() => {
        (new ErrorAccumulator())
          .err(new Error('built-in Error'))
          .err(new EvalError('built-in EvalError'))
          .err(new RangeError('built-in RangeError'))
          .err(new ReferenceError('built-in ReferenceError'))
          .err(new SyntaxError('built-in SyntaxError'))
          .err(new TypeError('built-in TypeError'))
          .err(new UserError('built-in UserError'))
          .try();
      }).to.throw(JSON.stringify(
        [
          'built-in Error',
          'built-in EvalError',
          'built-in RangeError',
          'built-in ReferenceError',
          'built-in SyntaxError',
          'built-in TypeError',
          'built-in UserError',
        ],
      ));
    });
  });

  describe('add', () => {
    it('example (to be thrown)', () => {
      const date = new Date();
      const userErrorMessage = 'UserError@line';
      const userError = new UserError(userErrorMessage);
      const userErrorLineNum = lineNumber() - 1; // The UserError was created one line before
      const previousAcc = (new ErrorAccumulator())
        .err(new Error('previous0'))
        .err(new Error('previous1'));

      const acc = new ErrorAccumulator();
      expect(() => {
        acc
          .add(true)
          .add(5150)
          .add('string test')
          .add(['array0', 'array1'])
          .add({ prop: 'val' })
          .add(function func() {}) // eslint-disable-line prefer-arrow-callback
          .add(() => {})
          .add(/abc/)
          .add(Symbol()) // eslint-disable-line symbol-description
          .add(new Blob('blb', { type: 'blob/error' }))
          .add(date)
          .add(new Error('ErrorTest'))
          .add(new EvalError('EvalErrorTest'))
          .add(new RangeError('RangeErrorTest'))
          .add(new ReferenceError('ReferenceErrorTest'))
          .add(new SyntaxError('SyntaxErrorTest'))
          .add(new TypeError('TypeErrorTest'))
          .add(userError)
          .add(previousAcc)
          .try();
      }).to.throw(JSON.stringify(
        [
          'boolean: true',
          'number: 5150',
          'string: "string test"',
          'string: "array0"', 'string: "array1"',
          'object: {"prop":"val"}',
          'function: function func() {}',
          'function: () => {}',
          'RegExp: /abc/',
          'Symbol: Symbol()',
          'Blob: blob/error',
          `Date: ${date}`,
          'ErrorTest',
          'EvalErrorTest',
          'RangeErrorTest',
          'ReferenceErrorTest',
          'SyntaxErrorTest',
          'TypeErrorTest',
          `${userErrorMessage}`,
          'previous0',
          'previous1',
        ],
      ));

      const error = acc.error();
      expect(error).to.be.an.instanceOf(Error);
      expect(error.stack)
        .to.match(new RegExp(`${userErrorMessage}\n.+${thisFileNameRegExp}:${userErrorLineNum}:`))
        .not.include(requiredFileName);

      const errors = acc.errors();
      expect(errors[errors.length - 3].message).to.include(userErrorMessage);
    });

    it('example (not to be thrown)', () => {
      const acc = new ErrorAccumulator();
      expect(() => {
        acc
          .add(undefined)
          .add(null)
          .add(false)
          .try()
          .add(0)
          .add(NaN)
          .add('')
          .try()
          .add([])
          .add({})
          .add(new ErrorAccumulator())
          .try();
      }).to.not.throw();

      expect(acc.error()).to.be.null;
      expect(acc.errors()).to.deep.equal([]);
    });
  });

  describe('error', () => {
    it('should return an error stack for a nested error array', () => {
      const nestdErrorArray = [
        [new Error('0-1'), new Error('0-2')],
        [
          [new Error('1-0-0'), new Error('1-0-1')],
          [
            [
              [new Error('1-1-0-0'), new Error('1-1-0-1')],
              [],
            ],
            [new Error('1-3-0'), new Error('1-3-1')],
          ],
        ],
        [
          new Error('2-0'),
          [new Error('2-1-0'), new Error('2-1-1')],
        ],
      ];

      expect((new ErrorAccumulator()).add(nestdErrorArray).error().stack)
        .to.match(new RegExp([]
          .concat('^')
          .concat(nestdErrorArray
            .flat(Infinity)
            .map((e) => `Error: ${e.message}\\n[^\n]+${thisFileNameRegExp}(.|\n)+`)
            .join(''))
          .concat('$')
          .join('')))
        .to.not.include(requiredFileName);
    });

    it('should merge the two instaces sequentially', () => {
      const accA = new ErrorAccumulator();
      const accB = new ErrorAccumulator();
      accA.err(new Error('A1'));
      accB.err(new Error('B1'));
      accA.err(new Error('A2'));
      accB.err(new Error('B2'));
      accA.err(accB);

      expect(accA.errors().map((e) => e.message)).to.deep.equal(['A1', 'A2', 'B1', 'B2']);
    });

    [
      {
        it: 'should throw an error without stack',
        error: () => {
          const e = new Error('WithoutStack');
          delete e.stack;
          return e;
        },
      },
      {
        it: 'should throw an error without string message',
        error: () => {
          const e = new Error('WithoutStringMessage');
          e.message = { prop: 'this is not string' };
          return e;
        },
      },
      {
        it: 'should throw an error without stack and string message',
        error: () => {
          const e = new Error('WithoutStackAndStringMessage');
          delete e.stack;
          e.message = { prop: 'this is not string' };
          return e;
        },
      },
    ].forEach((c) => {
      it(c.it, () => {
        const e = c.error();
        expect(() => {
          (new ErrorAccumulator()).err(e).try();
        }).to.throw(JSON.stringify(e.message));
      });
    });
  });
});
