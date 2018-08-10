'use strict';
const uglify = require('uglify-js');
const logger = require('bole')('collapsify:collapsers:javascript');

async function external(opts) {
  const {body} = await opts.fetch(opts.resourceLocation);
  return collapse(body, opts);
}

async function collapse(body, opts) {
  const original = String(body);

  const {error, warnings = [], code} = uglify.minify(
    {
      [opts.resourceLocation]: original
    },
    {
      output: {
        inline_script: true // eslint-disable-line camelcase
      },
      warnings: true
    }
  );

  if (error) {
    logger.error(error);
    return original;
  }

  for (const message of warnings) {
    logger.warn(message);
  }

  return code;
}

collapse.external = external;

module.exports = collapse;
