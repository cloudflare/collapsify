'use strict';
const logger = require('bole')('collapsify');
const httpClient = require('./utils/httpclient');
const collapseHTML = require('./collapsers/html');

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
      throw new Error('Forbidden Resource ' + url);
    }

    logger.info('Fetching external URL "%s".', url);

    return fetch(url);
  }

  return collapseHTML.external({
    fetch: read,
    resourceLocation
  });
};
