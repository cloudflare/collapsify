'use strict';
const posthtml = require('posthtml');
const logger = require('bole')('collapsify:collapsers:html');

async function external(opts) {
  const url = opts.resourceLocation;
  logger.info('Fetching external HTML from "%s".', url);

  const {body} = await opts.fetch(url);
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
