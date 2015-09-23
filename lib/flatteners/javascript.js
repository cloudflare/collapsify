'use strict';
var Rx = require('rx');
var uglify = require('uglify-js');

module.exports = function(logger, httpClient) {
  function flattenExternalJavaScript(resourceLocation) {

    logger.info('Fetching JavaScript from %s.', resourceLocation);

    return httpClient
      .fetch(resourceLocation)
      .flatMap(flattenJavaScript)
      .tapOnError(function(err) {
        logger.info({
          err: err
        });
      });
  }

  function flattenJavaScript(rawJavaScript) {
    try {
      return Rx.Observable.return(uglify.minify(rawJavaScript + '', {
        fromString: true,
        output: {
          inline_script: true
        }
      }).code);
    } catch(e) {
      return Rx.Observable.return(rawJavaScript);
    }
  }

  return {
    flatten: flattenJavaScript,
    flattenExternal: flattenExternalJavaScript
  };
};
