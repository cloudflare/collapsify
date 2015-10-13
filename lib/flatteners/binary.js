'use strict';
var Rx = require('rx');
var base64Utils = require('../utils/base64');

module.exports = function(logger, httpClient) {
  function flattenExternalBinary(resourceLocation) {
    if (base64Utils.validateSync(resourceLocation)) {
      return Rx.Observable.return(resourceLocation);
    }

    logger.info('Fetching binary from %s.', resourceLocation);

    return httpClient
      .fetch(resourceLocation)
      .flatMap(flattenBinary)
      .tapOnError(function(err) {
        logger.info({
          err: err
        });
      });
  }

  function flattenBinary(rawBinary) {
    return base64Utils.encode(rawBinary);
  }

  return {
    flatten: flattenBinary,
    flattenExternal: flattenExternalBinary
  };
};
