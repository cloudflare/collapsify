'use strict';
const assert = require('power-assert');
const Bluebird = require('bluebird');
const {describe, it} = require('mocha');
const collapser = require('../../lib/collapsers/html');

describe('html collapser', () => {
  it('should collapse a script tag', () => {
    return collapser(
      '<html><body><script>alert("foo" + "bar");</script></body></html>',
      {
        fetch() {
          assert(false, 'unexpected resource resolution');
        }
      }
    ).then(collapsed => {
      assert(typeof collapsed === 'string');
      assert(
        collapsed ===
          '<html><body><script>alert("foobar");</script></body></html>'
      );
    });
  });

  it('should collapse an image', () => {
    return collapser(
      '<html><body><img src="https://example.org/foobar.png"></body></html>',
      {
        fetch(url) {
          assert(url === 'https://example.org/foobar.png');
          return Bluebird.resolve(Buffer.from(''));
        },
        resourceLocation: 'https://example.com'
      }
    ).then(collapsed => {
      assert(typeof collapsed === 'string');
      assert(
        collapsed ===
          '<html><body><img src="data:application/x-empty;charset=binary;base64,"></body></html>'
      );
    });
  });

  it('should collapse an external HTML page', () => {
    return collapser
      .external('https://terinstock.com', {
        fetch(url) {
          switch (url) {
            case 'https://terinstock.com':
              return Bluebird.resolve(
                Buffer.from(
                  '<!doctype html><html><body><h1>Hi.</h1><img src="avatar.jpeg"></body></html>'
                )
              );
            case 'https://terinstock.com/avatar.jpeg':
              return Bluebird.resolve(Buffer.from(''));
            default:
              return Bluebird.reject(
                new assert.AssertionError('unknown resource resolution')
              );
          }
        },
        resourceLocation: 'https://terinstock.com'
      })
      .then(collapsed => {
        assert(typeof collapsed === 'string');
        assert(
          collapsed ===
            '<!doctype html><html><body><h1>Hi.</h1><img src="data:application/x-empty;charset=binary;base64,"></body></html>'
        );
      });
  });
});
