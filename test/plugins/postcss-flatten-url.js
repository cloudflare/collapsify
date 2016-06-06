'use strict';
var postcss = require('postcss');
var assert = require('power-assert');
var Bluebird = require('bluebird');
var describe = require('mocha').describe;
var it = require('mocha').it;

var plugin = require('../../lib/plugins/postcss-flatten-url');

function test(input, output, opts) {
  return postcss([plugin(opts)]).process(input).then(function (result) {
    assert(result.css === output);
  });
}

describe('postcss-flatten-url', function () {
  it('should ignore properties that don\'t contain URLs', function () {
    return test('.flatten { background: #0581C1 }', '.flatten { background: #0581C1 }');
  });

  it('should replace the URL in a property', function () {
    return test('.flatten { background: url("example.png") }', '.flatten { background: url("data:application/x-empty;charset=binary;base64,") }', {
      fetch: function (url) {
        assert(url === 'http://example.com/example.png');
        return Bluebird.resolve(new Buffer(''));
      },
      resourceLocation: 'http://example.com/'
    });
  });

  it('should ignore URLs from the data scheme', function () {
    return test('.flatten { background: url("data:application/x-empty;charset=binary;base64,") }', '.flatten { background: url("data:application/x-empty;charset=binary;base64,") }', {
      fetch: function () {
        assert.fail('should not have called fetch');
      },
      resourceLocation: 'http://example.com/'
    });
  });
});
