'use strict';
const {resolve} = require('url');
const postcss = require('postcss');
const valueParser = require('postcss-value-parser');
const collapseBinary = require('../collapsers/binary');
const cssURL = require('../utils/css-url');

const postcssFlattenURLs = postcss.plugin(
  'postcss-flatten-url',
  opts => async css => {
    const tasks = [];

    css.walkDecls(decl => {
      const parsedValue = valueParser(decl.value);
      const newTasks = [];

      parsedValue.walk((node, index, nodes) => {
        const url = cssURL(node, false);

        if (!url) return;

        newTasks.push(
          collapseBinary
            .external(resolve(opts.resourceLocation, url), opts)
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
);

module.exports = postcssFlattenURLs;
