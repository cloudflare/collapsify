'use strict';
const url = require('url');
const collapseBinary = require('../collapsers/binary');
const base64Utils = require('../utils/base-64');

module.exports = opts => async tree => {
  const tasks = [];

  tree.match(
    {
      tag: 'img',
      attrs: {
        src: true
      }
    },
    node => {
      if (base64Utils.validateSync(node.attrs.src)) {
        return node;
      }

      const promise = collapseBinary
        .external(url.resolve(opts.resourceLocation, node.attrs.src), {
          fetch: opts.fetch
        })
        .then(collapsed => {
          node.attrs.src = collapsed;
        });

      tasks.push(promise);
      return node;
    }
  );

  await Promise.all(tasks);
  return tree;
};
