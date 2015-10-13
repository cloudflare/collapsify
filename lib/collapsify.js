'use strict';
var HTTPClient = require('./utils/httpclient');

// Register our custom errors. :(
require('./utils/errors');

module.exports = function(resourceRoot, options) {
  var httpClient = new HTTPClient(options);
  var logger = options.logger;

  var flattenBinary = require('./flatteners/binary')(logger, httpClient);
  var flattenJavaScript = require('./flatteners/javascript')(logger, httpClient);
  var flattenStylesheet = require('./flatteners/stylesheet')(logger, resourceRoot, httpClient, flattenBinary);
  var flattenHTML = require('./flatteners/html')(logger, resourceRoot, httpClient, flattenJavaScript, flattenStylesheet, flattenBinary);

  return flattenHTML.flattenExternal(resourceRoot).tap(function(flattened) {
    logger.info('Final collapsed page is %d bytes', flattened.length);
  });
};
