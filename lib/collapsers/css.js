'use strict';
const Bluebird = require('bluebird');
const postcss = require('postcss');
const cssnano = require('cssnano');
const logger = require('bole')('collapsify:collapsers:css');

function external(url, opts) {
  logger.info('Fetching external CSS from "%s".', url);

  return opts.fetch(url).then(buf => {
    return collapse(buf, opts);
  });
}

function collapse(buf, opts) {
  const lazy = postcss()
    .use(require('../plugins/postcss-flatten-url')(opts))
    .use(require('../plugins/postcss-flatten-import')(opts))
    .use(cssnano({
      discardUnused: false,
      discardDuplicates: false
    }))
    .process(String(buf));

  return Bluebird.resolve(lazy)
    .then(result => {
      result.warnings().forEach(message => {
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
