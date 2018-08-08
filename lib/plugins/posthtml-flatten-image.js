'use strict';
const {resolve} = require('url');
const collapseBinary = require('../collapsers/binary');
const dataURI = require('../utils/data-uri');

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
      if (dataURI.validateSync(node.attrs.src)) {
        return node;
      }

      const promise = collapseBinary
        .external({
          fetch: opts.fetch,
          resourceLocation: resolve(opts.resourceLocation, node.attrs.src)
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
