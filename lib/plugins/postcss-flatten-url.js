'use strict';
const {resolve} = require('url');
const valueParser = require('postcss-value-parser');
const collapseBinary = require('../collapsers/binary');
const cssURL = require('../utils/css-url');

module.exports = (opts = {}) => {
  return {
    postcssPlugin: 'postcss-flatten-url',
    async Once(css) {
      const tasks = [];

      css.walkDecls(decl => {
        const parsedValue = valueParser(decl.value);
        const newTasks = [];

        parsedValue.walk((node, index, nodes) => {
          const url = cssURL(node, false);

          if (!url) return;

          newTasks.push(
            collapseBinary
              .external({
                fetch: opts.fetch,
                resourceLocation: resolve(opts.resourceLocation, url)
              })
              .then(binaryString => {
                nodes[index] = {
                  type: 'function',
                  value: 'url',
                  nodes: [
                    {
                      type: 'word',
                      value: binaryString
                    }
                  ]
                };
              })
          );
        });

        const promise = Promise.all(newTasks).then(() => {
          decl.value = parsedValue.toString();
        });

        tasks.push(promise);
      });

      await Promise.all(tasks);
      return css;
    }
  };
};
