'use strict';
const {resolve} = require('url');
const postcss = require('postcss');
const valueParser = require('postcss-value-parser');
const collapseCSS = require('../collapsers/css');
const cssURL = require('../utils/css-url');

const postcssFlattenImports = postcss.plugin(
  'postcss-flatten-import',
  opts => async css => {
    const tasks = [];

    css.walkAtRules('import', rule => {
      const parsedValue = valueParser(rule.params);
      const url = cssURL(parsedValue.nodes[0], true);

      if (!url) return;

      const promise = collapseCSS
        .external(resolve(opts.resourceLocation, url), {
          imported: true,
          fetch: opts.fetch,
          resourceLocation: resolve(opts.resourceLocation, url)
        })
        .then(result => {
          if (parsedValue.nodes.length > 1) {
            rule.name = 'media';
            rule.params = rule.params
              .slice(parsedValue.nodes[1].sourceIndex)
              .trim();
            rule.raws.between = ' ';
            rule.append(result.root);
          } else {
            rule.replaceWith(result.root);
          }
        });

      tasks.push(promise);
    });

    await Promise.all(tasks);
    return css;
  }
);

module.exports = postcssFlattenImports;
