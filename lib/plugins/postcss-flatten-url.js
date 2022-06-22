'use strict';
const valueParser = require('postcss-value-parser');
const collapseBinary = require('../collapsers/binary');
const cssURL = require('../utils/css-url');

module.exports = (options = {}) => {
  return {
    postcssPlugin: 'postcss-flatten-url',
    async Once(css) {
      const tasks = [];

      css.walkDecls((decl) => {
        const parsedValue = valueParser(decl.value);
        const newTasks = [];

        parsedValue.walk((node, index, nodes) => {
          const url = cssURL(node, false);

          if (!url) return;

          newTasks.push(
            collapseBinary
              .external({
                fetch: options.fetch,
                resourceLocation: new URL(
                  url,
                  options.resourceLocation,
                ).toString(),
              })
              .then((binaryString) => {
                nodes[index] = {
                  type: 'function',
                  value: 'url',
                  nodes: [
                    {
                      type: 'word',
                      value: binaryString,
                    },
                  ],
                };
              }),
          );
        });

        const promise = Promise.all(newTasks).then(() => {
          decl.value = parsedValue.toString();
        });

        tasks.push(promise);
      });

      await Promise.all(tasks);
      return css;
    },
  };
};
