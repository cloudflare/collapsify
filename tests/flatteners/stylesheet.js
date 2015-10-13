'use strict';
var expect = require('assume');
var errors = require('../../lib/utils/errors');
var flattenBinary = require('../../lib/flatteners/binary');
var flattenStylesheet = require('../../lib/flatteners/stylesheet');
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

describe('Stylesheet Flattener', function() {
  var flattener;
  var logger;
  var httpClient;

  beforeEach(function() {
    logger = new MockLogger();
    httpClient = new HttpClient();
    var binaryFlattener = flattenBinary(logger, httpClient);
    flattener = flattenStylesheet(logger, 'http://fake.internal/', httpClient, binaryFlattener);
  });

  describe('flatten', function() {
    it('should minify CSS without external resources', function(done) {
      flattener.flatten(new Buffer('body {\n  font-size: 16pt;\n}'))
        .subscribe(function(css) {
          tryDone(done, function() {
            expect(css).is.a('string');
            expect(css).equals('body{font-size:16pt}');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(1);
            expect(logger.logs[0]).eqls(['info', 'Flattening raw CSS from %s.', 'inline style']);
          });
        }, done);
    });

    it('should minify CSS with relative resources', function(done) {
      nock('http://fake.internal')
        .get('/mime.gif')
        .reply(200, new Buffer([0xF0, 0x9F, 0x9A, 0x97]));

      flattener.flatten(new Buffer('body {\n  background: url(\'mime.gif\');\n}'), 'http://fake.internal/style.css')
        .subscribe(function(css) {
          tryDone(done, function() {
            expect(css).is.a('string');
            expect(css).equals('body{background:url(data:text/plain; charset=utf-8;base64,8J+alw==)}');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(2);
            expect(logger.logs[0]).eqls(['info', 'Flattening raw CSS from %s.', 'http://fake.internal/style.css']);
          });
        }, done);
    });

    it('should minify CSS with absolute resources', function(done) {
      nock('https://fake.internal')
        .get('/mime.gif')
        .reply(200, new Buffer([0xF0, 0x9F, 0x9A, 0x97]));

      flattener.flatten(new Buffer('body {\n  background: url(\'https://fake.internal/mime.gif\');\n}'), 'http://fake.internal/style.css')
        .subscribe(function(css) {
          tryDone(done, function() {
            expect(css).is.a('string');
            expect(css).equals('body{background:url(data:text/plain; charset=utf-8;base64,8J+alw==)}');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(2);
            expect(logger.logs[0]).eqls(['info', 'Flattening raw CSS from %s.', 'http://fake.internal/style.css']);
          });
        }, done);
    });

    it('should minify CSS with failing resources', function(done) {
      nock('http://fake.internal')
        .get('/mime.gif')
        .reply(404);

      flattener.flatten(new Buffer('body {\n  background: url(\'http://fake.internal/mime.gif\');\n}'), 'http://fake.internal/style.css')
        .subscribe(function() {
          done(new Error('fetch should have failed'));
        }, function(err) {
          tryDone(done, function() {
            expect(err).is.instanceOf(errors.HttpError);
            expect(err.code).equals('404');
            expect(err.name).equals('Http404Error');
            expect(err.message).equals('HTTP 404: http://fake.internal/mime.gif');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(3);
            expect(logger.logs[0]).eqls(['info', 'Flattening raw CSS from %s.', 'http://fake.internal/style.css']);

            expect(logger.logs[2]).is.an('array');
            expect(logger.logs[2][0]).equals('info');
            expect(logger.logs[2][1]).owns('err');
            expect(logger.logs[2][1].err).is.instanceOf(errors.HttpError);
            expect(logger.logs[2][1].err.code).equals('404');
            expect(logger.logs[2][1].err.name).equals('Http404Error');
            expect(logger.logs[2][1].err.message).equals('HTTP 404: http://fake.internal/mime.gif');
          });
        });
    });
  });

  describe('flattenExternal', function() {
    it('should minify successful external resource', function(done) {
      nock('http://fake.internal')
        .get('/style.css')
        .reply(200, 'body {\n  font-size: 16pt;\n}');

      flattener.flattenExternal('http://fake.internal/style.css')
        .subscribe(function(css) {
          tryDone(done, function() {
            expect(css).is.a('string');
            expect(css).equals('body{font-size:16pt}');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(2);
            expect(logger.logs[0]).eqls(['info', 'Fetching Stylesheet from %s.', 'http://fake.internal/style.css']);
            expect(logger.logs[1]).eqls(['info', 'Flattening raw CSS from %s.', 'http://fake.internal/style.css']);
          });
        }, done);
    });

    it('should report error for invalid resource', function(done) {
      nock('http://fake.internal')
        .get('/style.css')
        .reply(404);

      flattener.flattenExternal('http://fake.internal/style.css')
        .subscribe(function() {
          done(new Error('fetch should have failed'));
        }, function(err) {
          tryDone(done, function() {
            expect(err).is.instanceOf(errors.HttpError);
            expect(err.code).equals('404');
            expect(err.name).equals('Http404Error');
            expect(err.message).equals('HTTP 404: http://fake.internal/style.css');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(2);
            expect(logger.logs[0]).eqls(['info', 'Fetching Stylesheet from %s.', 'http://fake.internal/style.css']);

            expect(logger.logs[1]).is.an('array');
            expect(logger.logs[1][0]).equals('info');
            expect(logger.logs[1][1]).owns('err');
            expect(logger.logs[1][1].err).is.instanceOf(errors.HttpError);
            expect(logger.logs[1][1].err.code).equals('404');
            expect(logger.logs[1][1].err.name).equals('Http404Error');
            expect(logger.logs[1][1].err.message).equals('HTTP 404: http://fake.internal/style.css');
          });
        });
    });
  });
});
