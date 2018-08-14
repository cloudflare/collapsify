'use strict';
var assert = require('power-assert');
var nock = require('nock');
var describe = require('mocha').describe;
var it = require('mocha').it;
var collapsify = require('../');

nock.disableNetConnect();

describe('collapsify', function () {
  it('should collapse an HTML page', function () {
    nock('https://terinstock.com')
      .get('/')
      .reply(200, '<!doctype html><html><body><h1>Hi.</h1><img src="avatar.jpeg" /></body></html>')
      .get('/avatar.jpeg')
      .reply(200, '');

    return collapsify('https://terinstock.com', {})
      .then(function (collapsed) {
        assert(typeof collapsed === 'string');
        assert(collapsed === '<!doctype html><html><body><h1>Hi.</h1><img src="data:application/x-empty;charset=binary;base64,"></body></html>');
      });
  });

  it('should reject forbidden resources', function () {
    nock('https://terinstock.com')
      .get('/')
      .reply(200, '<!doctype html><img src="http://localhost">');

    return collapsify('https://terinstock.com', {
      forbidden: 'localhost'
    })
      .then(function () {
        assert(false, 'unexpected Promise resolution');
      }, function (err) {
        assert(err instanceof Error);
        assert(err.message === 'Forbidden Resource');
      });
  });
});
