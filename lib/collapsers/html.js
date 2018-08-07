'use strict';
const Bluebird = require('bluebird');
const posthtml = require('posthtml');
const logger = require('bole')('collapsify:collapsers:html');

function external(url, opts) {
  logger.info('Fetching external HTML from "%s".', url);

  return opts.fetch(url).then(buf => {
    return collapse(buf, opts);
  });
}

function collapse(buf, opts) {
  const lazy = posthtml()
    .use(require('../plugins/posthtml-flatten-image')(opts))
    .use(require('../plugins/posthtml-flatten-style')(opts))
    .use(require('../plugins/posthtml-flatten-script')(opts))
    .process(String(buf));

  return Bluebird.resolve(lazy)
    .then(result => {
      return result.html;
    });
}

collapse.external = external;

module.exports = collapse;
