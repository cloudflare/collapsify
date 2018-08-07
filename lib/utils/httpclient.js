'use strict';
const got = require('got');
const he = require('he');
const VERSION = require('../version');

module.exports = function(defaultHeaders) {
  async function fetch(url) {
    const headers = Object.assign(
      {},
      {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:33.0) Gecko/20100101 Firefox/33.0 Collapsify/' +
          VERSION +
          ' node/' +
          process.version
      },
      defaultHeaders
    );

    url = he.decode(url);

    const res = await got(url, {
      headers,
      encoding: null,
      timeout: 2000,
      retries: 0
    });

    return res.body;
  }

  fetch.fetch = fetch;

  return fetch;
};
