'use strict';
var Bluebird = require('bluebird');
var httpClient = require('./utils/httpclient');
var collapseHTML = require('./collapsers/html');

module.exports = function (resourceRoot, options) {
  var fetch = httpClient(options.headers);

  options = Object.assign({
    forbidden: 'a^'
  }, options);

  function read(resourceURL) {
    var re = RegExp(options.forbidden, 'i');

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
