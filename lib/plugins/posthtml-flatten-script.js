'use strict';
const url = require('url');
const Bluebird = require('bluebird');
const logger = require('bole')('posthtml-flatten-script');
const collapseJavaScript = require('../collapsers/javascript');

const reCDATA = /<!\[CDATA\[|\]\]>/gi;

module.exports = function (opts) {
  return function posthtmlFlattenScript(tree) {
    const tasks = [];

    tree.match({tag: 'script'}, node => {
      let promise;
      const newNode = {
        tag: 'script',
        attrs: {}
      };

      if (node.attrs && node.attrs.type && node.attrs.type !== 'text/javascript' && node.attrs.type !== 'application/javascript') {
        logger.debug('ignoring script of type "%s"', node.attrs.type);
        return node;
      }

      if (node.attrs && node.attrs.src) {
        promise = collapseJavaScript.external(url.resolve(opts.resourceLocation, node.attrs.src), {
          fetch: opts.fetch
        })
          .then(collapsed => {
            newNode.attrs.type = node.attrs && node.attrs.type;
            newNode.content = collapsed;
          });
      } else {
        const js = node.content.join('').replace(reCDATA, '');
        promise = collapseJavaScript(js)
          .then(script => {
            newNode.attrs.type = node.attrs && node.attrs.type;
            newNode.content = script;
          });
      }

      tasks.push(promise);
      return newNode;
    });

    return Bluebird.all(tasks).then(() => {
      return tree;
    });
  };
};
