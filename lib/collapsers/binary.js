'use strict';
const logger = require('bole')('collapsify:collapsers:binary');
const base64Utils = require('../utils/base-64');

function external(url, opts) {
  logger.info('Fetching external binary from "%s".', url);

  return opts.fetch(url).then(collapse);
}

function collapse(buf) {
  return base64Utils.encode(buf);
}

collapse.external = external;

module.exports = collapse;
