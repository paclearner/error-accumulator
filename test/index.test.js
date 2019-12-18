/* eslint-env mocha */
const { expect } = require('chai');
const Blob = require('node-blob');

const ErrorAccumulator = require('../index');

const lineNumber = () => {
  const e = new Error();
  if (e.lineNumber) return lineNumber;
  if (!e.stack) return NaN;
  return parseInt(e.stack.split('index.test.js:')[2].match(/^(\d+)/)[1], 10);
};

describe('error-accumulator', () => {
  it('should throw no error', () => {
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

  it('should throw an error', () => {
    class UserError extends Error {
      constructor(...params) {
        super(...params);
        this.name = 'CustomError';
      }
    }

    const acc1 = new ErrorAccumulator();
    acc1.add(new Error('PreviousError0'));
    acc1.add(new Error('PreviousError1'));

    const UserErrorMessage = 'UserError@line';

    const acc2 = new ErrorAccumulator();
    const date = new Date();
    expect(() => {
      acc2
        .add(true)
        .add(5150)
        .add('string test')
        .add(['array0', 'array1'])
        .add({ prop: 'val' })
        .add(function errorFunc() {}) // eslint-disable-line prefer-arrow-callback
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
        .add(new UserError(UserErrorMessage))
        .add(acc1)
        .try();
    }).to.throw(/Error/);

    const lineNum = lineNumber() - 5; // The UserError was added 5 lines before

    const error = acc2.error();
    expect(error).to.be.an.instanceOf(Error);
    expect(error.message).to.equal(JSON.stringify(
      [
        'boolean: true',
        'number: 5150',
        'string: "string test"',
        'string: "array0"', 'string: "array1"',
        'object: {"prop":"val"}',
        'function: function errorFunc() {}',
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
        `${UserErrorMessage}`,
        'PreviousError0',
        'PreviousError1',
      ],
    ));

    expect(error.stack).to
      .match(new RegExp(`${UserErrorMessage}\n.+index\\.test\\.js:${lineNum}:`))
      .not.include('index.js');

    const errors = acc2.errors();
    expect(errors[errors.length - 3].message).to.include(UserErrorMessage);
  });

  it('should return a error stack for nested error array', () => {
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
    const acc = new ErrorAccumulator();
    acc.add(nestdErrorArray);
    const error = acc.error();
    nestdErrorArray.flat(Infinity).forEach((item) => {
      expect(error.stack).to
        .match(new RegExp(`(^|\n)${item}\n[^\n]+index[.]test[.]js`), 'gm');
    });
    expect(error.stack).to.not.include('index.js');
  });

  it('should merge the two instaces', () => {
    const a = new ErrorAccumulator();
    const b = new ErrorAccumulator();
    a.add(new Error('A1'));
    b.add(new Error('B1'));
    a.add(new Error('A2'));
    b.add(new Error('B2'));
    a.add(b);

    const errors = a.errors();
    expect(errors[0].message).to.equal('A1');
    expect(errors[1].message).to.equal('A2');
    expect(errors[2].message).to.equal('B1');
    expect(errors[3].message).to.equal('B2');
  });

  it('should throw an error with broken errors', () => {
    const errorWithoutStack = new Error('WithoutStack');
    delete errorWithoutStack.stack;

    const errorWithoutStringMessage = new Error();
    errorWithoutStringMessage.message = { propA: 'WithoutStringMessage' };

    const errorWithoutBoth = new Error();
    delete errorWithoutBoth.stack;
    errorWithoutBoth.message = { propB: 'WithoutBoth' };


    const acc = new ErrorAccumulator();
    expect(() => {
      acc
        .add(errorWithoutStack)
        .try();
    }).to.throw(/WithoutStack/);
    expect(() => {
      acc
        .add(errorWithoutStringMessage)
        .try();
    }).to.throw(/WithoutStringMessage/);
    expect(() => {
      acc
        .add(errorWithoutBoth)
        .try();
    }).to.throw(/WithoutBoth/);

    acc.add(acc); // add itself
    expect(acc.errors().length).to.eql(6);
    expect(() => {
      acc
        .try();
    }).to.throw(/WithoutStack.*propA.*WithoutStringMessage.*propB.*WithoutBoth/);
  });
});
