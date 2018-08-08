'use strict';
const logger = require('bole')('collapsify:collapsers:binary');
const base64Utils = require('../utils/base-64');

async function external(opts) {
  const url = opts.resourceLocation;
  logger.info('Fetching external binary from "%s".', url);

  const res = await opts.fetch(url);
  return collapse(res);
}

function collapse(buf) {
  return base64Utils.encode(buf);
}

collapse.external = external;

module.exports = collapse;
