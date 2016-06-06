'use strict';
var Bluebird = require('bluebird');
var postcss = require('postcss');
var cssnano = require('cssnano');
var logger = require('bole')('collapsify:collapsers:css');

function external(url, opts) {
  logger.info('Fetching external CSS from "%s".', url);

  return opts.fetch(url).then(function (buf) {
    return collapse(buf, opts);
  });
}

function collapse(buf, opts) {
  var lazy = postcss()
        .use(require('../plugins/postcss-flatten-url')(opts))
        .use(require('../plugins/postcss-flatten-import')(opts))
        .use(cssnano({
          discardUnused: false,
          discardDuplicates: false
        }))
        .process(String(buf));

  return Bluebird.resolve(lazy)
    .then(function (result) {
      result.warnings().forEach(function (message) {
        logger.warn(message);
      });

      if (opts.imported) {
        return result;
      }

      return result.css;
    });
}

collapse.external = external;

module.exports = collapse;
