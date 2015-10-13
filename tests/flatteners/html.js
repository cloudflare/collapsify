'use strict';
var expect = require('assume');
var errors = require('../../lib/utils/errors');
var flattenBinary = require('../../lib/flatteners/binary');
var flattenJavaScript = require('../../lib/flatteners/javascript');
var flattenStylesheet = require('../../lib/flatteners/stylesheet');
var flattenHTML = require('../../lib/flatteners/html');
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

describe('HTML Flattener', function() {
  var flattener;
  var logger;
  var httpClient;
  beforeEach(function() {
    logger = new MockLogger();
    httpClient = new HttpClient();
    var binaryFlattener = flattenBinary(logger, httpClient);
    var javascriptFlattener = flattenJavaScript(logger, httpClient);
    var stylesheetFlattener = flattenStylesheet(logger, 'http://fake.internal/', httpClient, binaryFlattener);
    flattener = flattenHTML(logger, 'http://fake.internal/', httpClient, javascriptFlattener, stylesheetFlattener, binaryFlattener);
  });

  describe('flatten', function() {
    it('should flatten HTML with relative resources', function(done) {
      nock('http://fake.internal/')
        .get('/mime.gif')
        .reply(200, new Buffer([0xF0, 0x9F, 0x9A, 0x97]))
        .get('/style.css')
        .reply(200, 'body {\n  font-size: 16pt\n}');

      flattener.flatten(new Buffer('<html><head><link rel="stylesheet" href="/style.css"></head><body><img src="mime.gif"></body>'))
        .subscribe(function(html) {
          tryDone(done, function() {
            expect(html).is.a('string');
            expect(html).equals('<html><head><style type="text/css" rel="stylesheet">body{font-size:16pt}</style></head><body><img src="data:text/plain; charset=utf-8;base64,8J+alw=="></body></html>');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(3);
          });
        }, done);
    });

    it('should flatten HTML with absolute resources', function(done) {
      nock('http://fake.internal/')
        .get('/mime.gif')
        .reply(200, new Buffer([0xF0, 0x9F, 0x9A, 0x97]))
        .get('/style.css')
        .reply(200, 'body {\n  font-size: 16pt\n}');

      flattener.flatten(new Buffer('<html><head><link rel="stylesheet" href="http://fake.internal/style.css"></head><body><img src="http://fake.internal/mime.gif"></body>'))
        .subscribe(function(html) {
          tryDone(done, function() {
            expect(html).is.a('string');
            expect(html).equals('<html><head><style type="text/css" rel="stylesheet">body{font-size:16pt}</style></head><body><img src="data:text/plain; charset=utf-8;base64,8J+alw=="></body></html>');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(3);
          });
        }, done);
    });

    it('should report error when flattening HTML with failing resources', function(done) {
      nock('http://fake.internal/')
        .get('/mime.gif')
        .reply(200, new Buffer([0xF0, 0x9F, 0x9A, 0x97]))
        .get('/style.css')
        .reply(404);

      flattener.flatten(new Buffer('<html><head><link rel="stylesheet" href="/style.css"></head><body><img src="mime.gif"></body>'))
        .subscribe(function() {
          done(new Error('fetch should have failed'));
        }, function(err) {
          tryDone(done, function() {
            expect(err).is.instanceOf(errors.HttpError);
            expect(err.code).equals('404');
            expect(err.name).equals('Http404Error');
            expect(err.message).equals('HTTP 404: http://fake.internal/style.css');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(3);
          });
        });
    });

    it('should flatten HTML with inline stylesheets', function(done) {
      flattener.flatten(new Buffer('<html><head><style>body\n{\ncolor: black;\n}\n</style><body></body></html>'))
        .subscribe(function(html) {
          tryDone(done, function() {
            expect(html).is.a('string');
            expect(html).equals('<html><head><style>body{color:#000}</style></head><body></body></html>');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(1);
          });
        }, done);
    });
  });

  describe('flattenExternal', function() {
    it('should minify from a successfull external resource', function(done) {
      nock('http://fake.internal')
        .get('/')
        .reply(200, '<html><body><h1>Hello Secret Cats!</h1></body></html>');

      flattener.flattenExternal('http://fake.internal')
        .subscribe(function(html) {
          tryDone(done, function() {
            expect(html).is.a('string');
            expect(html).equals('<html><body><h1>Hello Secret Cats!</h1></body></html>');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(1);
          });
        }, done);
    });

    it('should minify from a successfull external resource', function(done) {
      nock('http://fake.internal')
        .get('/')
        .reply(404);

      flattener.flattenExternal('http://fake.internal')
        .subscribe(function() {
          done(new Error('fetch should have failed'));
        }, function(err) {
          tryDone(done, function() {
            expect(err).is.instanceOf(errors.HttpError);
            expect(err.code).equals('404');
            expect(err.name).equals('Http404Error');
            expect(err.message).equals('HTTP 404: http://fake.internal');

            expect(logger.logs).is.an('array');
            expect(logger.logs).has.length(2);
            expect(logger.logs[0]).eqls(['info', 'Getting HTML from %s', 'http://fake.internal']);

            expect(logger.logs[1]).is.an('array');
            expect(logger.logs[1][0]).equals('info');
            expect(logger.logs[1][1]).owns('err');
            expect(logger.logs[1][1].err).is.instanceOf(errors.HttpError);
            expect(logger.logs[1][1].err.code).equals('404');
            expect(logger.logs[1][1].err.name).equals('Http404Error');
            expect(logger.logs[1][1].err.message).equals('HTTP 404: http://fake.internal');
          })
        });
    });
  });
});
