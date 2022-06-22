'use strict';
const Rewriter = require('../utils/parse5-async-rewriter');

async function external(options) {
  const response = await options.fetch(options.resourceLocation);
  return collapse(await response.getAsString(), options);
}

async function collapse(text, options) {
  const rewriter = new Rewriter();

  require('../plugins/parse5-flatten-image')(rewriter, options);
  require('../plugins/parse5-flatten-inline-style')(rewriter, options);
  require('../plugins/parse5-flatten-external-style')(rewriter, options);
  require('../plugins/parse5-flatten-script')(rewriter, options);

  return rewriter.process(text);
}

collapse.external = external;

module.exports = collapse;
