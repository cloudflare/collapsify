'use strict';
const Bluebird = require('bluebird');
const posthtml = require('posthtml');
const logger = require('bole')('collapsify:collapsers:html');

async function external(url, opts) {
  logger.info('Fetching external HTML from "%s".', url);

  const buf = await opts.fetch(url);
  return collapse(buf, opts);
}

async function collapse(buf, opts) {
  const lazy = posthtml()
    .use(require('../plugins/posthtml-flatten-image')(opts))
    .use(require('../plugins/posthtml-flatten-style')(opts))
    .use(require('../plugins/posthtml-flatten-script')(opts))
    .process(String(buf));

  const result = await Bluebird.resolve(lazy);
  return result.html;
}

collapse.external = external;

module.exports = collapse;
