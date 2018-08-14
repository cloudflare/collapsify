'use strict';
var assert = require('power-assert');
var Bluebird = require('bluebird');
var describe = require('mocha').describe;
var it = require('mocha').it;
var collapser = require('../../lib/collapsers/javascript');

describe('JavaScript collapser', function () {
  it('should minify JavaScript', function () {
    return collapser(new Buffer('alert("foo: " + bar)'))
      .then(function (encoded) {
        assert(typeof encoded === 'string');
      });
  });

  it('should reject if invalid JavaScript', function () {
    return collapser(new Buffer('for: {'))
      .then(function () {
        assert.fail('expected rejected promise');
      }, function (err) {
        assert(err);
      });
  });

  describe('external', function () {
    it('should collapse an external script', function () {
      return collapser.external('https://example.com/script.js', {
        fetch: function (url) {
          assert(url === 'https://example.com/script.js');
          return Bluebird.resolve('console.log("hello world!");');
        }
      })
        .then(function (encoded) {
          assert(typeof encoded === 'string');
        });
    });
  });
});
