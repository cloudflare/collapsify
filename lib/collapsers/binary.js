'use strict';
const dataURI = require('../utils/data-uri');

async function external({fetch, resourceLocation: url}) {
  const {contentType, body} = await fetch(url);
  return collapse(body, {contentType});
}

function collapse(body, opts) {
  return dataURI.encodeSync(body, opts);
}

collapse.external = external;

module.exports = collapse;
