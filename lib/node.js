'use strict';
const httpClient = require('./utils/httpclient');
const collapseHTML = require('./collapsify');

module.exports = function(resourceLocation, options) {
  const fetch = httpClient(options.headers);

  options = Object.assign(
    {
      forbidden: 'a^'
    },
    options
  );

  async function read(url) {
    const re = new RegExp(options.forbidden, 'i');

    if (re.test(url)) {
      throw new Error('Forbidden resource ' + url);
    }

    return fetch(url);
  }

  return collapseHTML({
    fetch: read,
    resourceLocation
  });
};
