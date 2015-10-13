'use strict';
var expect = require('assume');
var HttpClient = require('../../lib/utils/httpclient');
var errors = require('../../lib/utils/errors');
var nock = require('nock');

function tryDone(done, fn) {
  try {
    fn();
    done();
  } catch(e) {
    fn(e);
  }
}

describe('HttpClient', function() {
  it('should onNext a Buffer if request was succesful', function(done) {
    var httpclient = new HttpClient();
    nock('http://fake.internal')
      .get('/mime.gif')
      .reply(200, new Buffer([0xF0, 0x9F, 0x9A, 0x97]));

    httpclient.fetch('http://fake.internal/mime.gif')
      .subscribe(function(buf) {
        tryDone(done, function() {
          expect(buf).is.a('buffer');
          expect(buf).eqls(new Buffer([0xF0, 0x9F, 0x9A, 0x97]));
        });
      }, done);
  });


  it('should report error for invalid resource', function(done) {
    var httpclient = new HttpClient();
    nock('http://fake.internal')
      .get('/mime.gif')
      .reply(404, 'Error 404: Not Found');

    httpclient.fetch('http://fake.internal/mime.gif')
      .subscribe(function() {
        done(new Error('fetch should have failed'));
      }, function(err) {
        tryDone(done, function() {
          expect(err).is.instanceOf(errors.HttpError);
          expect(err.code).equals('404');
          expect(err.name).equals('Http404Error');
          expect(err.message).equals('HTTP 404: http://fake.internal/mime.gif');
        });
      });
  });

  it('should onNext a Buffer if request was a successful relative redirect', function(done) {
    var httpclient = new HttpClient();
    nock('http://fake.internal')
      .get('/mime.gif')
      .reply(301, 'Luke, I\'ve found your content', {
        Location: '/mime.gifv'
      })
      .get('/mime.gifv')
      .reply(200, new Buffer([0xF0, 0x9F, 0x9A, 0x97]));

    httpclient.fetch('http://fake.internal/mime.gif')
      .subscribe(function(buf) {
        tryDone(done, function() {
          expect(buf).is.a('buffer');
          expect(buf).eqls(new Buffer([0xF0, 0x9F, 0x9A, 0x97]));
        });
      }, done);
  });


  it('should onNext a Buffer if request was a successful absolute redirect', function(done) {
    var httpclient = new HttpClient();
    nock('http://fake.internal')
      .get('/mime.gif')
      .reply(301, 'Luke, I\'ve found your content', {
        Location: 'http://fake.internal/mime.gifv'
      })
      .get('/mime.gifv')
      .reply(200, new Buffer([0xF0, 0x9F, 0x9A, 0x97]));

    httpclient.fetch('http://fake.internal/mime.gif')
      .subscribe(function(buf) {
        tryDone(done, function() {
          expect(buf).is.a('buffer');
          expect(buf).eqls(new Buffer([0xF0, 0x9F, 0x9A, 0x97]));
        });
      }, done);
  });

  it('should report error for too many redirects', function(done) {
    var httpclient = new HttpClient({
      follow_max: 1 // we have no reason to test long redirection chains
    });
    nock('http://fake.internal')
      .get('/mime.gif')
      .reply(301, 'Luke, I\'ve found your content', {
        Location: '/mime.gifv'
      })
      .get('/mime.gifv')
      .reply(301, 'Luke, I\'ve found your content', {
        Location: 'https://fake.internal/mime.gifv'
      });

    httpclient.fetch('http://fake.internal/mime.gif')
      .subscribe(function() {
        done(new Error('fetch should have failed'));
      }, function(err) {
        tryDone(done, function() {
          expect(err).is.instanceOf(errors.HttpError);
          expect(err).is.instanceOf(errors.find('HTTPRedirectionError'));
          expect(err.code).equals(1001);
          expect(err.name).equals('HTTPRedirectionError');
          expect(err.message).equals('The redirection limit has been reached: http://fake.internal/mime.gif');
        });
      });
  });


  it('should report handle HTTP requests with a bad status code', function(done) {
    var httpclient = new HttpClient();
    nock('http://fake.internal')
      .get('/mime.gif')
      .reply(900, 'Supper advanced error');

    httpclient.fetch('http://fake.internal/mime.gif')
      .subscribe(function() {
        done(new Error('fetch should have failed'));
      }, function(err) {
        tryDone(done, function() {
          expect(err).is.instanceOf(errors.HttpError);
          expect(err.code).equals(600);
          expect(err.name).equals('HttpError');
          expect(err.message).equals('HTTP 900: http://fake.internal/mime.gif');
        });
      });
  });


  it('should block redirections to forbidden domains', function(done) {
    var httpclient = new HttpClient({
      forbidden: 'cloudflare.com'
    });
    nock('http://fake.internal')
      .get('/mime.gif')
      .reply(301, 'Redirect to top secret website', {
        Location: 'https://cloudflare.com'
      });

    httpclient.fetch('http://fake.internal/mime.gif')
      .subscribe(function() {
        done(new Error('fetch should have failed'));
      }, function(err) {
        tryDone(done, function() {
          expect(err).is.instanceOf(errors.HttpError);
          expect(err).is.instanceOf(errors.find('ForbiddenURLError'));
          expect(err.code).equals(1000);
          expect(err.name).equals('ForbiddenURLError');
          expect(err.message).equals('https://cloudflare.com/');
        });
      });
  });

  it('should include arbitary headers', function(done) {
    var httpclient = new HttpClient({
      headers: {
        'x-top-secret': 'cats are better'
      }
    });
    nock('http://fake.internal', {
      reqheaders: {
        'x-top-secret': 'cats are better'
      }
    })
      .get('/mime.gif')
      .reply(200, 'Welcome to United Cats Alliance -- Top Secret ✓');

    httpclient.fetch('http://fake.internal/mime.gif')
      .subscribe(function(buf) {
        tryDone(done, function() {
          expect(buf).is.a('buffer');
          expect(buf.toString()).equals('Welcome to United Cats Alliance -- Top Secret ✓');
        });
      }, done);
  });
});
