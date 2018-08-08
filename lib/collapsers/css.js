'use strict';
const postcss = require('postcss');
const cssnano = require('cssnano');
const logger = require('bole')('collapsify:collapsers:css');

async function external(url, opts) {
  logger.info('Fetching external CSS from "%s".', url);

  const buf = await opts.fetch(url);
  return collapse(buf, opts);
}

async function collapse(buf, opts) {
  const lazy = postcss()
    .use(require('../plugins/postcss-flatten-url')(opts))
    .use(require('../plugins/postcss-flatten-import')(opts))
    .use(
      cssnano({
        discardUnused: false,
        discardDuplicates: false
      })
    )
    .process(String(buf), {from: opts.resourceLocation});

  const result = await lazy;

  for (const message of result.warnings()) {
    logger.warn(message);
  }

  if (opts.imported) {
    return result;
  }

  return result.css;
}

collapse.external = external;

module.exports = collapse;
