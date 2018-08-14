'use strict';
var urllib = require('url');
var Bluebird = require('bluebird');
var postcss = require('postcss');
var collapseCSS = require('../collapsers/css');

var postcssFlattenImports = postcss.plugin('postcss-flatten-import', function (opts) {
  return function (css) {
    return Bluebird.try(function () {
      var tasks = [];

      css.walkAtRules('import', function (importRule) {
        var matches = /(?:url\()?['"]?([^'"\)\s]*)['"]?(?:\))?(?:\s+(.+))?/gi.exec(importRule.params);

        if (!matches) {
          return;
        }

        var url = matches[1];
        var media = matches[2];
        var promise = collapseCSS.external(urllib.resolve(opts.resourceLocation, url), {
          imported: true,
          fetch: opts.fetch,
          resourceLocation: urllib.resolve(opts.resourceLocation, url)
        })
              .then(function (result) {
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

      return Bluebird.all(tasks)
        .then(function () {
          return css;
        });
    });
  };
});

module.exports = postcssFlattenImports;
