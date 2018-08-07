'use strict';
const assert = require('power-assert');
const nock = require('nock');
const describe = require('mocha').describe;
const it = require('mocha').it;
const collapsify = require('..');

nock.disableNetConnect();

describe('collapsify', () => {
  it('should collapse an HTML page', () => {
    nock('https://terinstock.com')
      .get('/')
      .reply(
        200,
        '<!doctype html><html><body><h1>Hi.</h1><img src="avatar.jpeg" /></body></html>'
      )
      .get('/avatar.jpeg')
      .reply(200, '');

    return collapsify('https://terinstock.com', {}).then(collapsed => {
      assert(typeof collapsed === 'string');
      assert(
        collapsed ===
          '<!doctype html><html><body><h1>Hi.</h1><img src="data:application/x-empty;charset=binary;base64,"></body></html>'
      );
    });
  });

  it('should reject forbidden resources', () => {
    nock('https://terinstock.com')
      .get('/')
      .reply(200, '<!doctype html><img src="http://localhost">');

    return collapsify('https://terinstock.com', {
      forbidden: 'localhost'
    }).then(
      () => {
        assert(false, 'unexpected Promise resolution');
      },
      err => {
        assert(err instanceof Error);
        assert(err.message === 'Forbidden Resource');
      }
    );
  });
});
