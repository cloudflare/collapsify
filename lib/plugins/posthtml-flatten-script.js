'use strict';
var url = require('url');
var Bluebird = require('bluebird');
var logger = require('bole')('posthtml-flatten-script');
var collapseJavaScript = require('../collapsers/javascript');

var reCDATA = /<!\[CDATA\[|\]\]>/gi;

module.exports = function (opts) {
  return function posthtmlFlattenScript(tree) {
    var tasks = [];

    tree.match({tag: 'script'}, function (node) {
      var promise;
      var newNode = {
        tag: 'script',
        attrs: {}
      };

      if (node.attrs && node.attrs.type && node.attrs.type !== 'text/javascript' && node.attrs.type !== 'application/javascript') {
        logger.debug('ignoring script of type "%s"', node.attrs.type);
        return node;
      }

      if (node.attrs && node.attrs.src) {
        promise = collapseJavaScript.external(url.resolve(opts.resourceLocation, node.attrs.src), {
          fetch: opts.fetch
        })
          .then(function (collapsed) {
            newNode.attrs.type = node.attrs && node.attrs.type;
            newNode.content = collapsed;
          });
      } else {
        var js = node.content.join('').replace(reCDATA, '');
        promise = collapseJavaScript(js)
          .then(function (script) {
            newNode.attrs.type = node.attrs && node.attrs.type;
            newNode.content = script;
          });
      }

      tasks.push(promise);
      return newNode;
    });

    return Bluebird.all(tasks).then(function () {
      return tree;
    });
  };
};
