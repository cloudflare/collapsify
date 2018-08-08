'use strict';
const uglify = require('uglify-js');
const logger = require('bole')('collapsify:collapsers:javascript');

async function external(opts) {
  const url = opts.resourceLocation;
  logger.info('Fetching external JavaScript from "%s".', url);

  const {body} = await opts.fetch(url);
  return collapse(body, opts);
}

async function collapse(body, {resourceLocation: url = '<script>'} = {}) {
  const {error, warnings = [], code} = uglify.minify(
    {
      [url]: String(body)
    },
    {
      output: {
        inline_script: true // eslint-disable-line camelcase
      },
      warnings: true
    }
  );

  if (error) throw error;

  for (const message of warnings) {
    logger.warn(message);
  }

  return code;
}

collapse.external = external;

module.exports = collapse;
