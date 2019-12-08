/* eslint-env mocha */
const expect = require('chai').expect; // eslint-disable-line prefer-destructuring
const accumulator = require('../index');

describe('ErrorAcc', () => {
  it('should throw no error', () => {
    const acc = accumulator();
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
        .add(accumulator())
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

    const acc1 = accumulator();
    acc1.add('previous error 1');
    acc1.add('previous error 2');

    const UserErrorMessageWithLineNumberTest = 'UserError test @line';

    const acc2 = accumulator();
    expect(() => {
      acc2
        .add(true)
        .add(5150)
        .add('string test')
        .add(['array0', 'array1'])
        .add({ objectKey: 'objectVal' })
        .add(new Error('Error test'))
        .add(new EvalError('EvalError test'))
        .add(new RangeError('RangeError test'))
        .add(new ReferenceError('ReferenceError test'))
        .add(new SyntaxError('SyntaxError test'))
        .add(new TypeError('TypeError test'))
        // make the next line number as lineNumber;
        .add(new UserError(UserErrorMessageWithLineNumberTest))
        .add(acc1)
        .try();
    }).to.throw(/Error/);

    const lineNumber = 57; // is a line number of the last new UserError.

    const error = acc2.error();
    expect(error).to.be.an.instanceOf(Error);
    expect(error.message).to.equal([
      '[',
      'true,',
      '5150,',
      '"string test",',
      '"array0","array1",',
      '{"objectKey":"objectVal"},',
      '"Error test",',
      '"EvalError test",',
      '"RangeError test",',
      '"ReferenceError test",',
      '"SyntaxError test",',
      '"TypeError test",',
      '"UserError test @line",',
      '"previous error 1",',
      '"previous error 2"',
      ']',
    ].join(''));

    expect(error.stack).to
      .match(new RegExp(`${UserErrorMessageWithLineNumberTest}\n.+index\\.test\\.js:${lineNumber}:`))
      .not.include('index.js');

    const errors = acc2.errors();
    expect(errors[errors.length - 3].message).to.include(UserErrorMessageWithLineNumberTest);
  });

  it('should merge the two instaces', () => {
    const a = accumulator();
    const b = accumulator();
    a.add('A1');
    b.add('B1');
    a.add('A2');
    b.add('B2');
    a.add(b);

    const errors = a.errors();
    expect(errors[0].message).to.equal('A1');
    expect(errors[1].message).to.equal('A2');
    expect(errors[2].message).to.equal('B1');
    expect(errors[3].message).to.equal('B2');
  });

  it('should throw an error with broken errors', () => {
    const errorWithoutStack = new Error();
    const errorWithoutStringMessage = new Error();
    const errorWithoutBoth = new Error();

    errorWithoutStack.message = 'without stack';
    delete errorWithoutStack.stack;

    errorWithoutStringMessage.message = { this: 'is a message' };

    errorWithoutBoth.message = { 'the message': 'is this' };
    delete errorWithoutBoth.stack;

    const acc = accumulator();
    expect(() => {
      acc
        .add(errorWithoutStack)
        .try();
    }).to.throw(/without stack/);
    expect(() => {
      acc
        .add(errorWithoutStringMessage)
        .try();
    }).to.throw(/is a message/);
    expect(() => {
      acc
        .add(errorWithoutBoth)
        .try();
    }).to.throw(/is this/);

    acc.add(acc);
    expect(acc.errors().length).to.eql(6);
    expect(() => {
      acc
        .try();
    }).to.throw(/without stack.*is a message.*is this.*without stack.*is a message.*is this/);
  });
});
