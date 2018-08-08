'use strict';
const logger = require('bole')('collapsify:collapsers:binary');
const dataURI = require('../utils/data-uri');

async function external({fetch, resourceLocation: url}) {
  logger.info('Fetching external binary from "%s".', url);

  const {contentType, body} = await fetch(url);
  return collapse(body, {contentType});
}

function collapse(body, opts) {
  return dataURI.encodeSync(body, opts);
}

collapse.external = external;

module.exports = collapse;
