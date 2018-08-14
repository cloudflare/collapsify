'use strict';
var url = require('url');
var Bluebird = require('bluebird');
var collapseBinary = require('../collapsers/binary');
var base64Utils = require('../utils/base-64');

module.exports = function (opts) {
  return function posthtmlFlattenImage(tree) {
    return Bluebird.try(function () {
      var tasks = [];

      tree.match({
        tag: 'img',
        attrs: {
          src: true
        }
      }, function (node) {
        if (base64Utils.validateSync(node.attrs.src)) {
          return node;
        }

        var promise = collapseBinary.external(url.resolve(opts.resourceLocation, node.attrs.src), {
          fetch: opts.fetch
        })
              .then(function (collapsed) {
                node.attrs.src = collapsed;
              });

        tasks.push(promise);
        return node;
      });

      return Bluebird.all(tasks).then(function () {
        return tree;
      });
    });
  };
};
