'use strict';
const terser = require('terser');
const logger = require('bole')('collapsify:collapsers:javascript');

async function external(opts) {
  const response = await opts.fetch(opts.resourceLocation);
  return collapse(await response.getAsString(), opts);
}

async function collapse(bodyString, opts) {
  try {
    const result = await terser.minify({[opts.resourceLocation]: bodyString});
    return result.code;
  } catch (error) {
    logger.error(error);
    return bodyString;
  }
}

collapse.external = external;

module.exports = collapse;
