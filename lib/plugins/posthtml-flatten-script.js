'use strict';
const {resolve} = require('url');
const logger = require('bole')('posthtml-flatten-script');
const collapseJavaScript = require('../collapsers/javascript');

const reCDATA = /<!\[CDATA\[|\]\]>/gi;

module.exports = opts => async tree => {
  const tasks = [];

  tree.match({tag: 'script'}, node => {
    let promise;
    const newNode = {
      tag: 'script',
      attrs: {}
    };

    if (
      node.attrs &&
      node.attrs.type &&
      node.attrs.type !== 'text/javascript' &&
      node.attrs.type !== 'application/javascript'
    ) {
      logger.debug('ignoring script of type "%s"', node.attrs.type);
      return node;
    }

    if (node.attrs && node.attrs.src) {
      promise = collapseJavaScript
        .external({
          fetch: opts.fetch,
          resourceLocation: resolve(opts.resourceLocation, node.attrs.src)
        })
        .then(collapsed => {
          newNode.attrs.type = node.attrs && node.attrs.type;
          newNode.content = collapsed;
        });
    } else {
      const js = node.content.join('').replace(reCDATA, '');
      promise = collapseJavaScript(js).then(script => {
        newNode.attrs.type = node.attrs && node.attrs.type;
        newNode.content = script;
      });
    }

    tasks.push(promise);
    return newNode;
  });

  await Promise.all(tasks);
  return tree;
};
