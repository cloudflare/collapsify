'use strict';
const url = require('url');
const postcss = require('postcss');
const valueParser = require('postcss-value-parser');
const base64Utils = require('../utils/base-64');
const collapseBinary = require('../collapsers/binary');

const postcssFlattenURLs = postcss.plugin(
  'postcss-flatten-url',
  opts => async css => {
    const tasks = [];

    css.walkDecls(decl => {
      const parsedValue = valueParser(decl.value);
      let newTasks = [];

      parsedValue.walk(node => {
        if (node.type !== 'function' || node.value !== 'url') {
          return true;
        }

        newTasks = newTasks.concat(
          node.nodes
            .filter(node => {
              return node.type === 'word' || node.type === 'string';
            })
            .map(async node => {
              if (base64Utils.validateSync(node.value)) {
                return;
              }

              const binaryString = await collapseBinary.external(
                url.resolve(opts.resourceLocation, node.value),
                opts
              );

              node.value = binaryString;
            })
        );

        return false;
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
