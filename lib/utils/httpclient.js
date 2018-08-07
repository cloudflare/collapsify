'use strict';
const got = require('got');
const he = require('he');
const Bluebird = require('bluebird');
const VERSION = require('../version');

module.exports = function (defaultHeaders) {
  function fetch(url) {
    const headers = Object.assign({}, {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:33.0) Gecko/20100101 Firefox/33.0 Collapsify/' + VERSION + ' node/' + process.version
    }, defaultHeaders);

    url = he.decode(url);

    return Bluebird.resolve(got(url, {
      headers,
      encoding: null,
      timeout: 2000,
      retries: 0
    })).then(res => {
      return res.body;
    });
  }

  fetch.fetch = fetch;

  return fetch;
};
