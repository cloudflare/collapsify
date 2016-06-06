'use strict';
var url = require('url');
var Bluebird = require('bluebird');
var postcss = require('postcss');
var valueParser = require('postcss-value-parser');
var base64Utils = require('../utils/base-64');
var collapseBinary = require('../collapsers/binary');

var postcssFlattenURLs = postcss.plugin('postcss-flatten-url', function (opts) {
  return function (css) {
    return Bluebird.try(function () {
      var tasks = [];

      css.walkDecls(function (decl) {
        var parsedValue = valueParser(decl.value);
        var newTasks = [];

        parsedValue.walk(function (node) {
          if (node.type !== 'function' || node.value !== 'url') {
            return true;
          }

          newTasks = newTasks.concat(node.nodes.filter(function (node) {
            return node.type === 'word' || node.type === 'string';
          }).map(function (node) {
            if (base64Utils.validateSync(node.value)) {
              return Bluebird.resolve(node.value);
            }

            return collapseBinary.external(url.resolve(opts.resourceLocation, node.value), opts)
              .then(function (binaryString) {
                node.value = binaryString;
              });
          }));

          return false;
        });

        var promise = Bluebird.all(newTasks).then(function () {
          decl.value = parsedValue.toString();
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

module.exports = postcssFlattenURLs;
