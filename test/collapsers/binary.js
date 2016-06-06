'use strict';
var path = require('path');
var assert = require('power-assert');
var fs = require('mz/fs');
var describe = require('mocha').describe;
var it = require('mocha').it;
var collapser = require('../../lib/collapsers/binary');

describe('binary collapser', function () {
  it('should collapse a GIF', function () {
    return fs.readFile(path.join(__dirname, '../fixtures/gif.gif'))
      .then(collapser)
      .then(function (encoded) {
        assert(typeof encoded === 'string');
        assert(encoded.match(/^data:image\/gif;charset=binary;base64,/));
      });
  });

  describe('external', function () {
    it('should collapse an external binary', function () {
      return collapser.external('https://example.com/gif.gif', {
        fetch: function (url) {
          assert(url === 'https://example.com/gif.gif');
          return fs.readFile(path.join(__dirname, '../fixtures/gif.gif'));
        }
      })
        .then(function (encoded) {
          assert(typeof encoded === 'string');
          assert(encoded.match(/^data:image\/gif;charset=binary;base64,/));
        });
    });
  });
});
