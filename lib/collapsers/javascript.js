'use strict';
var uglify = require('uglify-js');
var Bluebird = require('bluebird');
var logger = require('bole')('collapsify:collapsers:javascript');

function external(url, opts) {
  logger.info('Fetching external JavaScript from "%s".', url);

  return opts.fetch(url).then(collapse);
}

function collapse(buf) {
  return Bluebird.try(function () {
    return uglify.minify(String(buf), {
      fromString: true,
      output: {
        inline_script: true // eslint-disable-line camelcase
      }
    }).code;
  });
}

collapse.external = external;

module.exports = collapse;
