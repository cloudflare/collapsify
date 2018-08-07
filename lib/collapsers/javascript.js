'use strict';
const uglify = require('uglify-js');
const Bluebird = require('bluebird');
const logger = require('bole')('collapsify:collapsers:javascript');

async function external(url, opts) {
  logger.info('Fetching external JavaScript from "%s".', url);

  const res = await opts.fetch(url);
  return collapse(res);
}

function collapse(buf) {
  return Bluebird.try(() => {
    const {error, code} = uglify.minify(String(buf), {
      output: {
        inline_script: true // eslint-disable-line camelcase
      }
    });

    if (error) throw error;

    return code;
  });
}

collapse.external = external;

module.exports = collapse;
