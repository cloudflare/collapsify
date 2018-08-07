'use strict';
const Bluebird = require('bluebird');
const httpClient = require('./utils/httpclient');
const collapseHTML = require('./collapsers/html');

module.exports = function(resourceRoot, options) {
  const fetch = httpClient(options.headers);

  options = Object.assign(
    {
      forbidden: 'a^'
    },
    options
  );

  function read(resourceURL) {
    const re = new RegExp(options.forbidden, 'i');

    if (re.test(resourceURL)) {
      return Bluebird.reject(new Error('Forbidden Resource'));
    }

    return fetch(resourceURL);
  }

  return collapseHTML.external(resourceRoot, {
    fetch: read,
    resourceLocation: resourceRoot
  });
};
