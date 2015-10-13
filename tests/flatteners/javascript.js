'use strict';
var expect = require('assume');
var errors = require('../../lib/utils/errors');
var flattenJavaScript = require('../../lib/flatteners/javascript');
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

describe('JavaScript Flattener', function() {
  var flattener;
  var logger;
  var httpClient;
  beforeEach(function() {
    logger = new MockLogger();
    httpClient = new HttpClient();
    flattener = flattenJavaScript(logger, httpClient);
  });

  describe('flatten', function() {
    it('should minify JavaScript', function(done) {
      flattener.flatten(new Buffer('function logTest(string) {\n  console.log(\'testing\', string);\n}'))
        .subscribe(function(js) {
          tryDone(done, function() {
            expect(js).is.a('string');
          });
        });
    });

    it('should return the original JS if minify error', function(done) {
      var badJS = 'function logTest {\n  console.log(\'testing\', string);\n}';
      flattener.flatten(new Buffer(badJS))
        .subscribe(function(js) {
          tryDone(done, function() {
            expect(js).is.a('string');
            expect(js).equals(badJS);
          });
        });
    });
  });

  describe('flattenExternal', function() {
    it('should minify from a successful external resource', function(done) {
      nock('http://fake.internal')
        .get('/app.js')
        .reply(200, 'function logTest(string) {\n  console.log(\'testing\', string);\n}');

      flattener.flattenExternal('http://fake.internal/app.js')
        .subscribe(function(js) {
          tryDone(done, function() {
            expect(js).is.a('string');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(1);
            expect(logger.logs[0]).eqls(['info', 'Fetching JavaScript from %s.', 'http://fake.internal/app.js']);
          });
        }, done);
    });

    it('should report error for invalid resource', function(done) {
      nock('http://fake.internal')
        .get('/app.js')
        .reply(404);

      flattener.flattenExternal('http://fake.internal/app.js')
        .subscribe(function() {
          done(new Error('fetch should have failed'));
        }, function(err) {
          tryDone(done, function() {
            expect(err).is.instanceOf(errors.HttpError);
            expect(err.code).equals('404');
            expect(err.name).equals('Http404Error');
            expect(err.message).equals('HTTP 404: http://fake.internal/app.js');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(2);
            expect(logger.logs[0]).eqls(['info', 'Fetching JavaScript from %s.', 'http://fake.internal/app.js']);

            expect(logger.logs[1]).is.an('array');
            expect(logger.logs[1][0]).equals('info');
            expect(logger.logs[1][1]).owns('err');
            expect(logger.logs[1][1].err).is.instanceOf(errors.HttpError);
            expect(logger.logs[1][1].err.code).equals('404');
            expect(logger.logs[1][1].err.name).equals('Http404Error');
            expect(logger.logs[1][1].err.message).equals('HTTP 404: http://fake.internal/app.js');
          });
        });
    });
  });
});
