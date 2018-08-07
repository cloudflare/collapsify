'use strict';
const url = require('url');
const Bluebird = require('bluebird');
const collapseCSS = require('../collapsers/css');

module.exports = function (opts) {
  return function posthtmlFlattenStyle(tree) {
    return Bluebird.try(() => {
      const tasks = [];

      tree.match([
        {
          tag: 'link',
          attrs: {
            href: true,
            rel: 'stylesheet'
          }
        },
        {
          tag: 'style'
        }
      ], node => {
        let newNode;
        let promise;

        switch (node.tag) {
          case 'link':
            newNode = {
              tag: 'style'
            };

            promise = collapseCSS.external(url.resolve(opts.resourceLocation, node.attrs.href), {
              fetch: opts.fetch,
              resourceLocation: url.resolve(opts.resourceLocation, node.attrs.href)
            })
              .then(collapsed => {
                newNode.content = collapsed;
              });
            break;
          case 'style':
            newNode = node;
            promise = collapseCSS(node.content, {
              imported: false,
              fetch: opts.fetch,
              resourceLocation: opts.resourceLocation
            })
              .then(collapsed => {
                newNode.content = collapsed;
              });
            break;
            // No default
        }

        tasks.push(promise);
        return newNode;
      });

      return Bluebird.all(tasks).then(() => {
        return tree;
      });
    });
  };
};
