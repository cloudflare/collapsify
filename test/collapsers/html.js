'use strict';
var assert = require('power-assert');
var Bluebird = require('bluebird');
var describe = require('mocha').describe;
var it = require('mocha').it;
var collapser = require('../../lib/collapsers/html');

describe('html collapser', function () {
  it('should collapse a script tag', function () {
    return collapser('<html><body><script>alert("foo" + "bar");</script></body></html>', {
      fetch: function () {
        assert(false, 'unexpected resource resolution');
      }
    })
      .then(function (collapsed) {
        assert(typeof collapsed === 'string');
        assert(collapsed === '<html><body><script>alert("foobar");</script></body></html>');
      });
  });

  it('should collapse an image', function () {
    return collapser('<html><body><img src="https://example.org/foobar.png"></body></html>', {
      fetch: function (url) {
        assert(url === 'https://example.org/foobar.png');
        return Bluebird.resolve(new Buffer(''));
      },
      resourceLocation: 'https://example.com'
    })
      .then(function (collapsed) {
        assert(typeof collapsed === 'string');
        assert(collapsed === '<html><body><img src="data:application/x-empty;charset=binary;base64,"></body></html>');
      });
  });

  it('should collapse an external HTML page', function () {
    return collapser.external('https://terinstock.com', {
      fetch: function (url) {
        switch (url) {
          case 'https://terinstock.com':
            return Bluebird.resolve(new Buffer('<!doctype html><html><body><h1>Hi.</h1><img src="avatar.jpeg"></body></html>'));
          case 'https://terinstock.com/avatar.jpeg':
            return Bluebird.resolve(new Buffer(''));
          default:
            return Bluebird.reject(new assert.AssertionError('unknown resource resolution'));
        }
      },
      resourceLocation: 'https://terinstock.com'
    })
      .then(function (collapsed) {
        assert(typeof collapsed === 'string');
        assert(collapsed === '<!doctype html><html><body><h1>Hi.</h1><img src="data:application/x-empty;charset=binary;base64,"></body></html>');
      });
  });
});
