'use strict';
const dataURI = require('../utils/data-uri');

async function external({fetch, resourceLocation: url}) {
  const response = await fetch(url);
  const contentType = response.getContentType();
  return collapse(await response.getAsArray(), {contentType});
}

async function collapse(bodyArray, opts) {
  return dataURI.encodeSync(bodyArray, opts);
}

collapse.external = external;

module.exports = collapse;
