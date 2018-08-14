'use strict';
var Bluebird = require('bluebird');
var posthtml = require('posthtml');
var logger = require('bole')('collapsify:collapsers:html');

function external(url, opts) {
  logger.info('Fetching external HTML from "%s".', url);

  return opts.fetch(url).then(function (buf) {
    return collapse(buf, opts);
  });
}

function collapse(buf, opts) {
  var lazy = posthtml()
        .use(require('../plugins/posthtml-flatten-image')(opts))
        .use(require('../plugins/posthtml-flatten-style')(opts))
        .use(require('../plugins/posthtml-flatten-script')(opts))
        .process(String(buf));

  return Bluebird.resolve(lazy)
    .then(function (result) {
      return result.html;
    });
}

collapse.external = external;

module.exports = collapse;
