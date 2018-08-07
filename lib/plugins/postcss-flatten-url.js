'use strict';
const url = require('url');
const Bluebird = require('bluebird');
const postcss = require('postcss');
const valueParser = require('postcss-value-parser');
const base64Utils = require('../utils/base-64');
const collapseBinary = require('../collapsers/binary');

const postcssFlattenURLs = postcss.plugin('postcss-flatten-url', opts => {
  return function(css) {
    return Bluebird.try(() => {
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
              .map(node => {
                if (base64Utils.validateSync(node.value)) {
                  return Bluebird.resolve(node.value);
                }

                return collapseBinary
                  .external(
                    url.resolve(opts.resourceLocation, node.value),
                    opts
                  )
                  .then(binaryString => {
                    node.value = binaryString;
                  });
              })
          );

          return false;
        });

        const promise = Bluebird.all(newTasks).then(() => {
          decl.value = parsedValue.toString();
        });

        tasks.push(promise);
      });

      return Bluebird.all(tasks).then(() => {
        return css;
      });
    });
  };
});

module.exports = postcssFlattenURLs;
