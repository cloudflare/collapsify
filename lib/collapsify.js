'use strict';
var Bluebird = require('bluebird');
var httpClient = require('./utils/httpclient');
var collapseHTML = require('./collapsers/html');

module.exports = function (resourceRoot, options) {
  var fetch = httpClient(options.headers);

  function read(resourceURL) {
    var re = RegExp(options.forbidden, 'i');

    if (re.test(resourceURL)) {
      return Bluebird.resolve('');
    }

    return fetch(resourceURL).catch(function () {
      return new Buffer('');
    });
  }

  return collapseHTML.external(resourceRoot, {
    fetch: read,
    resourceLocation: resourceRoot
  });
};
