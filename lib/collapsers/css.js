'use strict';
const postcss = require('postcss');
const cssnano = require('cssnano');
const logger = require('bole')('collapsify:collapsers:css');

async function external(opts) {
  const response = await opts.fetch(opts.resourceLocation);
  return collapse(await response.getAsString(), opts);
}

async function collapse(bodyString, opts) {
  const lazy = postcss()
    .use(require('../plugins/postcss-flatten-url')(opts))
    .use(require('../plugins/postcss-flatten-import')(opts))
    .use(cssnano({preset: 'default'}))
    .process(bodyString, {from: opts.resourceLocation});
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
