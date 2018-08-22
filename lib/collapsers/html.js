'use strict';
const Rewriter = require('../utils/parse5-async-rewriter');

async function external(opts) {
  const {body} = await opts.fetch(opts.resourceLocation);
  return collapse(body, opts);
}

async function collapse(body, opts) {
  const rewriter = new Rewriter();

  require('../plugins/parse5-flatten-image')(rewriter, opts);
  require('../plugins/parse5-flatten-inline-style')(rewriter, opts);
  require('../plugins/parse5-flatten-external-style')(rewriter, opts);
  require('../plugins/parse5-flatten-script')(rewriter, opts);

  return rewriter.process(String(body));
}

collapse.external = external;

module.exports = collapse;
