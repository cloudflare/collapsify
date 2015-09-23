'use strict';
var expect = require('assume');
var errors = require('../../lib/utils/errors');
var flattenBinary = require('../../lib/flatteners/binary');
var HttpClient = require('../../lib/utils/httpclient');
var MockLogger = require('../mocks/logger');
var nock = require('nock');

function tryDone(done, fn) {
  try {
    fn();
    done();
  } catch(e) {
    fn(e);
  }
}

describe('Binary Flattener', function() {
  var flattener;
  var logger;
  var httpClient;
  beforeEach(function() {
    logger = new MockLogger();
    httpClient = new HttpClient();
    flattener = flattenBinary(logger, httpClient);
  });

  describe('flatten', function() {
    it('should base64 encode raw binary', function(done) {
      var buf = new Buffer([0xF0, 0x9F, 0x9A, 0x97]);

      flattener.flatten(buf)
        .subscribe(function(encoded) {
          tryDone(done, function() {
            expect(encoded).is.a('string');
            expect(encoded).matches(/^data:text\/plain; charset=utf-8;base64,/);
            expect(logger.logs).has.length(0);
          });
        }, done);
    });
  });

  describe('flattenExternal', function() {
    it('should base64 encode from a successful external resource', function(done) {
      nock('http://fake.internal')
        .get('/mime.gif')
        .reply(200, new Buffer([0xF0, 0x9F, 0x9A, 0x97]));

      flattener.flattenExternal('http://fake.internal/mime.gif')
        .subscribe(function(encoded) {
          tryDone(done, function() {
            expect(encoded).is.a('string');
            expect(encoded).matches(/^data:text\/plain; charset=utf-8;base64,/);

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(1);
            expect(logger.logs[0]).eqls(['info', 'Fetching binary from %s.', 'http://fake.internal/mime.gif']);
          });
        }, done);
    });

    it('should report error for invalid resource', function(done) {
      nock('http://fake.internal')
        .get('/mime.gif')
        .reply(404, 'Error 404: Not Found');

      flattener.flattenExternal('http://fake.internal/mime.gif')
        .subscribe(function() {
          done(new Error('fetch should have failed'));
        }, function(err) {
          tryDone(done, function() {
            expect(err).is.instanceOf(errors.HttpError);
            expect(err.code).equals('404');
            expect(err.name).equals('Http404Error');
            expect(err.message).equals('HTTP 404: http://fake.internal/mime.gif');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(2);
            expect(logger.logs[0]).eqls(['info', 'Fetching binary from %s.', 'http://fake.internal/mime.gif']);

            expect(logger.logs[1]).is.an('array');
            expect(logger.logs[1][0]).equals('info');
            expect(logger.logs[1][1]).owns('err');
            expect(logger.logs[1][1].err).is.instanceOf(errors.HttpError);
            expect(logger.logs[1][1].err.code).equals('404');
            expect(logger.logs[1][1].err.name).equals('Http404Error');
            expect(logger.logs[1][1].err.message).equals('HTTP 404: http://fake.internal/mime.gif');
          });
        });
    });
  });
});
