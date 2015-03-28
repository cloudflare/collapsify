'use strict';
var expect = require('assume');
var base64 = require('../lib/utils/base64');
var fs = require('mz/fs');
var path = require('path');

describe('base64 utility', function() {
  describe('encode', function() {
    it('should base64 encode ASCII text', function() {
      return base64.encode(new Buffer('plain text')).then(function(encoded) {
        expect(encoded).is.a('string');
        expect(encoded).matches(/^data:text\/plain; charset=us-ascii;base64,/);
      });
    });

    it('should base64 encode Unicode text', function() {
      var buf = new Buffer([0xF0, 0x9F, 0x9A, 0x97]);

      return base64.encode(buf).then(function(encoded) {
        expect(encoded).is.a('string');
        expect(encoded).matches(/^data:text\/plain; charset=utf-8;base64,/);
      });
    });

    it('should base64 encode a GIF', function() {
      return fs.readFile(path.join(__dirname, 'fixtures/gif.gif'))
        .then(base64.encode)
        .then(function(encoded) {
          expect(encoded).is.a('string');
          expect(encoded).matches(/^data:image\/gif; charset=binary;base64,/);
        });
    });
  });

  describe('verifySync', function() {
    it('should verify ASCII text', function() {
      var encoded = 'data:text/plain; charset=us-ascii;base64,cGxhaW4gdGV4dA==';
      expect(base64.validateSync(encoded)).is.true();
    });

    it('should verify Unicode text', function() {
      var encoded = 'data:text/plain; charset=utf-8;base64,8J+alw==';
      expect(base64.validateSync(encoded)).is.true();
    });

    it('should verify a GIF', function() {
      var encoded = 'data:image/gif; charset=binary;base64,R0lGODlhAQABAAAAADs=';
      expect(base64.validateSync(encoded)).is.true();
    });
  });
});
