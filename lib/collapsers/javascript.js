'use strict';
const terser = require('terser');
const logger = require('bole')('collapsify:collapsers:javascript');

async function external(opts) {
  const {body} = await opts.fetch(opts.resourceLocation);
  return collapse(body, opts);
}

async function collapse(body, opts) {
  const original = String(body);

  try {
    const result = await terser.minify({[opts.resourceLocation]: original});
    return result.code;
  } catch (error) {
    logger.error(error);
    return original;
  }
}

collapse.external = external;

module.exports = collapse;
