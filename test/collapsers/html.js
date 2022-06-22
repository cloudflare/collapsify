import {Buffer} from 'node:buffer';
import assert from 'power-assert';
import {describe, it} from 'mocha';
import {binaryResponse, stringResponse} from '../helpers.js';
import collapser, {external} from '../../lib/collapsers/html.js';

describe('html collapser', () => {
  it('should collapse a script tag', async () => {
    const collapsed = await collapser(
      '<html><body><script>alert("foo" + "bar");</script></body></html>',
      {
        fetch() {
          assert(false, 'unexpected resource resolution');
        },
      },
    );

    assert(typeof collapsed === 'string');
    assert(
      collapsed ===
        '<html><body><script>alert("foobar");</script></body></html>',
    );
  });

  it('should collapse an image', async () => {
    const collapsed = await collapser(
      '<html><body><img src="https://example.org/foobar.png"></body></html>',
      {
        async fetch(url) {
          assert(url === 'https://example.org/foobar.png');
          return binaryResponse(Buffer.from(''), 'image/png');
        },
        resourceLocation: 'https://example.com',
      },
    );

    assert(typeof collapsed === 'string');
    assert(
      collapsed ===
        '<html><body><img src="data:image/png;base64,"></body></html>',
    );
  });

  it('should collapse an external HTML page', async () => {
    const collapsed = await external({
      async fetch(url) {
        switch (url) {
          case 'https://terinstock.com':
            return stringResponse(
              '<!doctype html><html><body><h1>Hi.</h1><img src="avatar.jpeg"></body></html>',
            );

          case 'https://terinstock.com/avatar.jpeg':
            return binaryResponse(Buffer.from(''), 'image/jpeg');

          default:
            throw new assert.AssertionError('unknown resource resolution');
        }
      },
      resourceLocation: 'https://terinstock.com',
    });

    assert(typeof collapsed === 'string');
    assert(
      collapsed ===
        '<!doctype html><html><body><h1>Hi.</h1><img src="data:image/jpeg;base64,"></body></html>',
    );
  });
});
