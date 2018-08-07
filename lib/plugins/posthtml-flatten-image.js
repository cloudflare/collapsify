'use strict';
const url = require('url');
const Bluebird = require('bluebird');
const collapseBinary = require('../collapsers/binary');
const base64Utils = require('../utils/base-64');

module.exports = function (opts) {
  return function posthtmlFlattenImage(tree) {
    return Bluebird.try(() => {
      const tasks = [];

      tree.match({
        tag: 'img',
        attrs: {
          src: true
        }
      }, node => {
        if (base64Utils.validateSync(node.attrs.src)) {
          return node;
        }

        const promise = collapseBinary.external(url.resolve(opts.resourceLocation, node.attrs.src), {
          fetch: opts.fetch
        })
          .then(collapsed => {
            node.attrs.src = collapsed;
          });

        tasks.push(promise);
        return node;
      });

      return Bluebird.all(tasks).then(() => {
        return tree;
      });
    });
  };
};
