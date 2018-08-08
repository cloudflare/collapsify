'use strict';
const got = require('got');
const he = require('he');
const VERSION = require('../version');

module.exports = function(defaultHeaders) {
  const headers = Object.freeze({
    'user-agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:33.0) Gecko/20100101 Firefox/33.0 Collapsify/${VERSION} node/${
      process.version
    }`,
    ...defaultHeaders
  });

  const opts = Object.freeze({
    headers,
    encoding: null,
    timeout: 2000,
    retries: 0
  });

  async function fetch(url) {
    url = he.decode(url);

    const res = await got(url, opts);

    return {
      contentType: res.headers['content-type'],
      body: res.body
    };
  }

  fetch.fetch = fetch;

  return fetch;
};
