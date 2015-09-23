'use strict';
var expect = require('assume');
var base64 = require('../lib/utils/base64');
var fs = require('mz/fs');
var Rx = require('rx');
var path = require('path');

describe('base64 utility', function() {
  describe('encode', function() {
    it('should base64 encode ASCII text', function(done) {
      base64.encode(new Buffer('plain text'))
        .subscribe(function(encoded) {
          try {
            expect(encoded).is.a('string');
            expect(encoded).matches(/^data:text\/plain; charset=us-ascii;base64,/);
            done();
          } catch(e) {
            done(e);
          }
        }, done);
    });

    it('should base64 encode Unicode text', function(done) {
      var buf = new Buffer([0xF0, 0x9F, 0x9A, 0x97]);

      base64.encode(buf)
        .subscribe(function(encoded) {
          try {
            expect(encoded).is.a('string');
            expect(encoded).matches(/^data:text\/plain; charset=utf-8;base64,/);
            done();
          } catch(e) {
            done(e);
          }
        }, done);
    });

    it('should base64 encode a GIF', function(done) {
      Rx.Observable.fromPromise(fs.readFile(path.join(__dirname, 'fixtures/gif.gif')))
        .flatMap(base64.encode)
        .subscribe(function(encoded) {
          try {
            expect(encoded).is.a('string');
            expect(encoded).matches(/^data:image\/gif; charset=binary;base64,/);
            done();
          } catch(e) {
            done(e);
          }
        }, done);
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
