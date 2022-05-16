'use strict';
const Rewriter = require('../utils/parse5-async-rewriter');

async function external(opts) {
  const response = await opts.fetch(opts.resourceLocation);
  return collapse(await response.getAsArray(), opts);
}

async function collapse(bodyArray, opts) {
  const rewriter = new Rewriter();

  require('../plugins/parse5-flatten-image')(rewriter, opts);
  require('../plugins/parse5-flatten-inline-style')(rewriter, opts);
  require('../plugins/parse5-flatten-external-style')(rewriter, opts);
  require('../plugins/parse5-flatten-script')(rewriter, opts);

  return rewriter.process(bodyArray);
}

collapse.external = external;

module.exports = collapse;
