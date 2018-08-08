'use strict';
const posthtml = require('posthtml');

async function external(opts) {
  const {body} = await opts.fetch(opts.resourceLocation);
  return collapse(body, opts);
}

async function collapse(body, opts) {
  const lazy = posthtml()
    .use(require('../plugins/posthtml-flatten-image')(opts))
    .use(require('../plugins/posthtml-flatten-style')(opts))
    .use(require('../plugins/posthtml-flatten-script')(opts))
    .process(String(body));

  const result = await lazy;
  return result.html;
}

collapse.external = external;

module.exports = collapse;
