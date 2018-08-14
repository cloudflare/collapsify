'use strict';
var path = require('path');
var assert = require('power-assert');
var fs = require('mz/fs');
var describe = require('mocha').describe;
var it = require('mocha').it;
var base64 = require('../../lib/utils/base-64');

describe('base64 utility', function () {
  describe('encode', function () {
    it('should base64 encode ASCII text', function () {
      return base64.encode(new Buffer('plain text')).then(function (encoded) {
        assert(typeof encoded === 'string');
        assert(encoded.match(/^data:text\/plain;charset=us-ascii;base64,/));
      });
    });

    it('should base64 encode Unicode text', function () {
      var buf = new Buffer([0xF0, 0x9F, 0x9A, 0x97]);

      return base64.encode(buf).then(function (encoded) {
        assert(typeof encoded === 'string');
        assert(encoded.match(/^data:text\/plain;charset=utf-8;base64,/));
      });
    });

    it('should base64 encode a GIF', function () {
      return fs.readFile(path.join(__dirname, '../fixtures/gif.gif'))
        .then(base64.encode)
        .then(function (encoded) {
          assert(typeof encoded === 'string');
          assert(encoded.match(/^data:image\/gif;charset=binary;base64,/));
        });
    });

    it('should not have spaces in the base64 string', function () {
      return fs.readFile(path.join(__dirname, '../fixtures/gif.gif'))
        .then(base64.encode)
        .then(function (encoded) {
          assert(typeof encoded === 'string');
          assert(!encoded.match(/\s/));
        });
    });
  });

  describe('verifySync', function () {
    it('should verify ASCII text', function () {
      var encoded = 'data:text/plain;charset=us-ascii;base64,cGxhaW4gdGV4dA==';
      assert(base64.validateSync(encoded));
    });

    it('should verify Unicode text', function () {
      var encoded = 'data:text/plain;charset=utf-8;base64,8J+alw==';
      assert(base64.validateSync(encoded));
    });

    it('should verify a GIF', function () {
      var encoded = 'data:image/gif;charset=binary;base64,R0lGODlhAQABAAAAADs=';
      assert(base64.validateSync(encoded));
    });
  });
});
