import {Buffer} from 'node:buffer';
import assert from 'power-assert';
import {describe, it} from 'mocha';
import {CollapsifyError} from '../../built/collapsify.js';
import {fetchWrapper} from '../../built/utils/fetch-wrapper.js';

describe('fetch-wrapper', () => {
  it('bad status code throws error', async () => {
    try {
      await fetchWrapper(() => new FakeResponse({statusCode: 404}))(
        'http://exmaple.com',
      );
      assert.fail('should have thrown');
    } catch (error) {
      assertError(error, 'Fetch failed, http://exmaple.com returned 404');
    }
  });

  it('failed getAsString', async () => {
    try {
      const response = await fetchWrapper(
        () => new FakeResponse({text: Promise.reject()}),
      )('http://exmaple.com');
      await response.getAsString();
      assert.fail('should have thrown');
    } catch (error) {
      assertError(error, `Couldn't read http://exmaple.com as string`);
    }
  });

  it('failed getAsArray', async () => {
    try {
      const response = await fetchWrapper(
        () => new FakeResponse({text: Promise.reject()}),
      )('http://exmaple.com');
      await response.getAsArray();
      assert.fail('should have thrown');
    } catch (error) {
      assertError(error, `Couldn't read http://exmaple.com as binary`);
    }
  });

  it('can read properties', async () => {
    const response = await fetchWrapper(
      () =>
        new FakeResponse({
          statusCode: 200,
          contentType: 'text/plain',
          text: Promise.resolve('some text'),
          binary: Buffer.from([0x01, 0x02]),
        }),
    )('http://exmaple.com');
    assert.equal(response.getStatusCode(), 200);
    assert.equal(response.getContentType(), 'text/plain');
    assert.equal(await response.getAsString(), 'some text');
    assert(
      Buffer.from([0x01, 0x02]).equals(await response.getAsArray()),
      'array response equal',
    );
  });
});

function assertError(error, message, type = CollapsifyError) {
  assert(error instanceof type, 'incorrect error type');
  assert.equal(error.message, message);
}

class FakeResponse {
  constructor({
    statusCode = 200,
    contentType = '',
    text = Promise.reject(),
    binary = Promise.reject(),
  }) {
    this.statusCode = statusCode;
    this.contentType = contentType;
    this.text = text;
    this.binary = binary;
  }

  getStatusCode() {
    return this.statusCode;
  }

  getContentType() {
    return this.contentType;
  }

  getAsString() {
    return this.text;
  }

  getAsArray() {
    return this.binary;
  }
}
