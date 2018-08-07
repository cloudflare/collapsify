'use strict';
const urllib = require('url');
const Bluebird = require('bluebird');
const postcss = require('postcss');
const collapseCSS = require('../collapsers/css');

const postcssFlattenImports = postcss.plugin('postcss-flatten-import', opts => {
  return function(css) {
    return Bluebird.try(async () => {
      const tasks = [];

      css.walkAtRules('import', importRule => {
        const matches = /(?:url\()?['"]?([^'")\s]*)['"]?(?:\))?(?:\s+(.+))?/gi.exec(
          importRule.params
        );

        if (!matches) {
          return;
        }

        const url = matches[1];
        const media = matches[2];
        const promise = collapseCSS
          .external(urllib.resolve(opts.resourceLocation, url), {
            imported: true,
            fetch: opts.fetch,
            resourceLocation: urllib.resolve(opts.resourceLocation, url)
          })
          .then(result => {
            if (media) {
              importRule.name = 'media';
              importRule.params = media;
              importRule.raws.between = ' ';
              importRule.append(result.root);
            } else {
              importRule.replaceWith(result.root);
            }
          });

        tasks.push(promise);
      });

      await Bluebird.all(tasks);
      return css;
    });
  };
});

module.exports = postcssFlattenImports;
