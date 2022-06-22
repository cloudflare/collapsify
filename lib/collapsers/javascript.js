'use strict';
const terser = require('terser');
const logger = require('bole')('collapsify:collapsers:javascript');

async function external(options) {
  const response = await options.fetch(options.resourceLocation);
  return collapse(await response.getAsString(), options);
}

async function collapse(bodyString, options) {
  try {
    const result = await terser.minify({
      [options.resourceLocation]: bodyString,
    });
    return result.code;
  } catch (error) {
    logger.error(error);
    return bodyString;
  }
}

collapse.external = external;

module.exports = collapse;
