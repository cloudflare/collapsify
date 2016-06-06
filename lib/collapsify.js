'use strict';
var url = require('url');
var posthtml = require('posthtml');
var Bluebird = require('bluebird');
var logger = require('bole')('collapsify');
var base64Utils = require('./utils/base-64');
var httpClient = require('./utils/httpclient');
var collapseBinary = require('./collapsers/binary');
var collapseJavaScript = require('./collapsers/javascript');
var collapseCSS = require('./collapsers/css');

module.exports = function (resourceRoot, options) {
  var fetch = httpClient(options.headers);

  function read(resourceURL) {
    var re = RegExp(options.forbidden, 'i');

    if (re.test(resourceURL)) {
      return Bluebird.resolve('');
    }

    return fetch(resourceURL).catch(function () {
      return new Buffer('');
    });
  }

  function relative(from, to) {
    if (!base64Utils.validateSync(from) && !base64Utils.validateSync(to)) {
      return url.resolve(from, to);
    }

    return to;
  }

  function flattenExternalHTML(resourceLocation) {
    logger.info('Getting HTML from %s', resourceLocation);

    return read(resourceLocation).then(flattenHTML);
  }

  function posthtmlFlattenImages(tree) {
    return Bluebird.try(function () {
      var tasks = [];

      tree.match({
        tag: 'img',
        attrs: {
          src: true
        }
      }, function (node) {
        if (base64Utils.validateSync(node.attrs.src)) {
          return Bluebird.resolve(node.attrs.src);
        }

        var promise = collapseBinary.external((relative(resourceRoot, node.attrs.src)), {
          fetch: fetch
        })
          .then(function (binaryString) {
            node.attrs.src = binaryString;
          });

        tasks.push(promise);
        return node;
      });

      return Bluebird.all(tasks)
        .then(function () {
          return tree;
        });
    });
  }

  function posthtmlFlattenStyle(tree) {
    return Bluebird.try(function () {
      var tasks = [];

      tree.match([
        {
          tag: 'link',
          attrs: {
            href: true,
            rel: 'stylesheet'
          }
        },
        {
          tag: 'style'
        }
      ], function (node) {
        var newNode;
        var promise;

        switch (node.tag) {
          case 'link':
            newNode = {
              tag: 'style'
            };

            promise = collapseCSS.external((relative(resourceRoot, node.attrs.href)), {
              fetch: fetch,
              resourceLocation: relative(resourceRoot, node.attrs.href)
            })
              .then(function (stylesheet) {
                newNode.content = stylesheet;
              });
            break;
          case 'style':
            newNode = node;
            promise = collapseCSS(node.content, {
              imported: false,
              fetch: fetch,
              resourceLocation: resourceRoot
            })
              .then(function (stylesheet) {
                newNode.content = stylesheet;
              });
            break;
            // no default
        }

        tasks.push(promise);
        return newNode;
      });

      return Bluebird.all(tasks)
        .then(function () {
          return tree;
        });
    });
  }

  function posthtmlFlattenScript(tree) {
    return Bluebird.try(function () {
      var tasks = [];

      tree.match({tag: 'script'}, function (node) {
        var promise;
        var newNode = {
          tag: 'script',
          attrs: {}
        };

        if (node.attrs && node.attrs.type && node.attrs.type !== 'text/javascript' && node.attrs.type !== 'text/javascript') {
          logger.debug('ignoring <script type="%s">', node.attrs.type);
          return node;
        }

        if (node.attrs && node.attrs.src) {
          promise = collapseJavaScript.external(relative(resourceRoot, node.attrs.src), {
            fetch: fetch
          })
            .then(function (script) {
              newNode.attrs.type = node.attrs && node.attrs.type;
              newNode.content = script;
            });
        } else {
          var js = node.content.join('').replace(/<!\[CDATA\[|\]\]>/gi, '');
          promise = collapseJavaScript(js)
            .then(function (script) {
              newNode.attrs.type = node.attrs && node.attrs.type;
              newNode.content = script;
            });
        }

        tasks.push(promise);
        return newNode;
      });

      return Bluebird.all(tasks)
        .then(function () {
          return tree;
        });
    });
  }

  function flattenHTML(rawHTML) {
    var lazy = posthtml()
      .use(posthtmlFlattenImages)
      .use(posthtmlFlattenStyle)
      .use(posthtmlFlattenScript)
      .process(rawHTML.toString());

    lazy = Bluebird.resolve(lazy);

    return lazy
      .then(function (result) {
        logger.debug('posthtml: %s', result.html);
        return result.html;
      })
      .catch(function (err) {
        logger.error(err, 'Error while collapsing HTML');
        return '';
      });
  }

  return flattenExternalHTML(resourceRoot).then(function (flattened) {
    logger.info('Final collapsed page is %d bytes', flattened.length);
    return flattened;
  });
};
