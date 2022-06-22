'use strict';
const postcss = require('postcss');
const cssnano = require('cssnano');
const logger = require('bole')('collapsify:collapsers:css');

async function external(options) {
  const response = await options.fetch(options.resourceLocation);
  return collapse(await response.getAsString(), options);
}

async function collapse(bodyString, options) {
  const lazy = postcss()
    .use(require('../plugins/postcss-flatten-url')(options))
    .use(require('../plugins/postcss-flatten-import')(options))
    .use(cssnano({preset: 'default'}))
    .process(bodyString, {from: options.resourceLocation});
  const result = await lazy;

  for (const message of result.warnings()) {
    logger.warn(message);
  }

  if (options.imported) {
    return result;
  }

  return result.css;
}

collapse.external = external;

module.exports = collapse;
