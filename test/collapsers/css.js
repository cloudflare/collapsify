'use strict';
var assert = require('power-assert');
var Bluebird = require('bluebird');
var describe = require('mocha').describe;
var it = require('mocha').it;
var collapser = require('../../lib/collapsers/css');

describe('CSS collapser', function () {
  it('should minify CSS', function () {
    return collapser(new Buffer('html, body { height: 100%; }'), {
      fetch: function () {
        assert(false, 'unexpected resource resolution');
      },
      resourceLocation: 'https://example.com'
    }).then(function (collapsed) {
      assert(typeof collapsed === 'string');
      assert(collapsed === 'body,html{height:100%}');
    });
  });

  it('should reject if invalid CSS', function () {
    return collapser(new Buffer('html, body {'), {
      fetch: function () {
        assert(false, 'unexpected resource resolution');
      },
      resourceLocation: 'https://example.com'
    }).then(function () {
      assert(false, 'unexpect Promise resolution');
    }, function (err) {
      assert(!(err instanceof assert.AssertionError));
      assert(err.reason === 'Unclosed block');
    });
  });

  describe('external', function () {
    it('should collapse an external binary', function () {
      return collapser(new Buffer('body { background: url("example.png") }'), {
        fetch: function (url) {
          assert(url === 'https://example.com/example.png');
          return Bluebird.resolve(new Buffer(''));
        },
        resourceLocation: 'https://example.com'
      }).then(function (collapsed) {
        assert(collapsed.match(/data:application\/x-empty/));
      });
    });
  });
});
