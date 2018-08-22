'use strict';
const postcss = require('postcss');
const cssnano = require('cssnano');
const logger = require('bole')('collapsify:collapsers:css');

async function external(opts) {
  const {body} = await opts.fetch(opts.resourceLocation);
  return collapse(body, opts);
}

async function collapse(body, opts) {
  const lazy = postcss()
    .use(require('../plugins/postcss-flatten-url')(opts))
    .use(require('../plugins/postcss-flatten-import')(opts))
    .use(
      cssnano({
        discardUnused: false,
        discardDuplicates: false
      })
    )
    .process(String(body), {from: opts.resourceLocation});

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
