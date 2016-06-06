'use strict';
var url = require('url');
var Bluebird = require('bluebird');
var collapseCSS = require('../collapsers/css');

module.exports = function (opts) {
  return function posthtmlFlattenStyle(tree) {
    return Bluebird.try(function () {
      var tasks = [];

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
      ], function (node) {
        var newNode;
        var promise;

        switch (node.tag) {
          case 'link':
            newNode = {
              tag: 'style'
            };

            promise = collapseCSS.external(url.resolve(opts.resourceLocation, node.attrs.href), {
              fetch: opts.fetch,
              resourceLocation: url.resolve(opts.resourceLocation, node.attrs.href)
            })
              .then(function (collapsed) {
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
              .then(function (collapsed) {
                newNode.content = collapsed;
              });
            break;
            // no default
        }

        tasks.push(promise);
        return newNode;
      });

      return Bluebird.all(tasks).then(function () {
        return tree;
      });
    });
  };
};
