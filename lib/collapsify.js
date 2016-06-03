'use strict';
var url = require('url');
var uglify = require('uglify-js');
var posthtml = require('posthtml');
var postcss = require('postcss');
var valueParser = require('postcss-value-parser');
var cssnano = require('cssnano');
var Bluebird = require('bluebird');
var logger = require('bole')('collapsify');
var base64Utils = require('./utils/base-64');
var httpClient = require('./utils/httpclient');

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
        var promise = flattenExternalBinary((relative(resourceRoot, node.attrs.src)))
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

            promise = flattenExternalStylesheet((relative(resourceRoot, node.attrs.href)))
              .then(function (stylesheet) {
                newNode.content = stylesheet;
              });
            break;
          case 'style':
            newNode = node;
            promise = flattenStylesheet(node.content)
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
          promise = flattenExternalJavaScript(relative(resourceRoot, node.attrs.src))
            .then(function (script) {
              newNode.attrs.type = node.attrs && node.attrs.type;
              newNode.content = script;
            });
        } else {
          var js = node.content.join('').replace(/<!\[CDATA\[|\]\]>/gi, '');
          promise = flattenJavaScript(js)
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
        logger.error('posthtml error:', err);
        return '';
      });
  }

  function flattenExternalJavaScript(resourceLocation) {
    logger.info('Fetching JavaScript from %s.', resourceLocation);

    return read(resourceLocation).then(flattenJavaScript);
  }

  function flattenJavaScript(rawJavaScript) {
    return Bluebird.try(function () {
      return uglify.minify(rawJavaScript.toString(), {
        fromString: true,
        output: {
          inline_script: true // eslint-disable-line camelcase
        }
      }).code;
    }).catch(function (err) {
      logger.error('Failed to minify some JavaScript: ', err);
      return '';
    });
  }

  function flattenExternalBinary(resourceLocation) {
    return Bluebird.try(function () {
      if (base64Utils.validateSync(resourceLocation)) {
        return resourceLocation;
      }

      logger.info('Fetching binary from %s.', resourceLocation);

      return read(resourceLocation).then(function (rawBinary) {
        return base64Utils.encode(rawBinary);
      });
    });
  }

  function flattenExternalStylesheet(resourceLocation, imported) {
    logger.info('Fetching Stylesheet from %s.', resourceLocation || 'inline node');

    return read(resourceLocation).then(function (rawCSS) {
      return flattenStylesheet(rawCSS, resourceLocation, imported);
    });
  }

  var postcssFlattenURLs = postcss.plugin('postcss-flatten-url', function (opt) {
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
              return flattenExternalBinary(relative(opt.resourceLocation, node.value))
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

  var postcssFlattenImports = postcss.plugin('postcss-flatten-import', function (opt) {
    return function (css) {
      return Bluebird.try(function () {
        var tasks = [];

        css.walkAtRules('import', function (importRule) {
          var matches = /(?:url\()?['"]?([^'"\)]*)['"]?(?:\))?(?:\s+(.+))?/gi.exec(importRule.params);

          if (!matches) {
            return;
          }

          var url = matches[1];
          var media = matches[2];
          var promise = flattenExternalStylesheet(relative(opt.resourceLocation, url), true)
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

  function flattenStylesheet(rawCSS, resourceLocation, imported) {
    var lazy = postcss()
      .use(postcssFlattenURLs({
        resourceLocation: resourceLocation
      }))
      .use(postcssFlattenImports({
        resourceLocation: resourceLocation
      }))
      .use(cssnano({
        discardUnused: false,
        discardDuplicates: false
      }))
      .process(rawCSS.toString());

    lazy = Bluebird.resolve(lazy);

    return lazy
      .then(function (result) {
        result.warnings().forEach(function (message) {
          logger.warn(message);
        });
        logger.debug('postcss: %s', result.css);

        if (imported) {
          return result;
        }

        return result.css;
      })
      .catch(function (err) {
        logger.error({
          err: err
        });

        if (imported) {
          return postcss.root();
        }

        return '';
      });
  }

  return flattenExternalHTML(resourceRoot).then(function (flattened) {
    logger.info('Final collapsed page is %d bytes', flattened.length);
    return flattened;
  });
};
