'use strict';
var htmlparser = require('htmlparser2');
var parserlib = require('parserlib');
var uglify = require('uglify-js');
var CleanCSS = require('clean-css');
var url = require('url');
var Bluebird = require('bluebird');
var base64Utils = require('./utils/base64');
var HTTPClient = require('./utils/httpclient');

module.exports = function(resourceRoot, options) {
  var httpClient = new HTTPClient(options.headers);

  var read = function(resourceURL) {
    var re = RegExp(options.forbidden, 'i');

    if (re.test(resourceURL)) {
      return Bluebird.resolve('');
    }

    return httpClient.fetch(resourceURL).catch(function() {
      return new Buffer('');
    });
  };
  var relative = function(from, to) {

    if (!base64Utils.validateSync(from) && !base64Utils.validateSync(to)) {
      return url.resolve(from, to);
    }

    return to;
  };
  var stringifyAttributes = function(attributes) {

    var excluded = Array.prototype.slice.call(arguments, 1).reduce(function(e, attr) {

      return (e[attr] = 1) && e;
    }, {});
    var result = '';

    for (var attribute in attributes) {
      if (!(attribute in excluded)) {
        result += ' ' + attribute + '="' + attributes[attribute] + '"';
      }
    }

    return result;
  };
  var flattenExternalHTML = function(resourceLocation) {

    options.logger.info('Getting HTML from %s', resourceLocation);

    return read(resourceLocation).then(flattenHTML);
  };
  var flattenHTML = function(rawHTML) {

    rawHTML = rawHTML.toString();

    var result = Bluebird.defer();
    var compilationQueue = Bluebird.resolve('');
    var handler = new htmlparser.DomHandler(function(error, dom) {

      if (error) {
        result.reject(error);
      } else {
        (function append(elements) {

          options.logger.info('Appending %d elements: %j', elements.length, elements.map(function(element) {
            return element.name || element.type;
          }));

          elements.forEach(function(element) {

            options.logger.info('Handling %s', element.name || element.type);

            var elementQueue = Bluebird.resolve('');
            var elementText = '';
            var closingElementText = '';

            switch (element.type) {

              case 'script':

                elementText = '<script';

                if ('attribs' in element) {

                  if ('src' in element.attribs) {
                    elementQueue = flattenExternalJavaScript(relative(resourceRoot, element.attribs.src));
                  }

                  elementText += stringifyAttributes(element.attribs, 'src');
                }

                if (!(('attribs' in element) && element.attribs.src) && 'children' in element && (typeof element.children[0] !== 'undefined' && element.children[0].type === 'text')) {

                  options.logger.info('Handling inline script text!');

                  elementQueue = flattenJavaScript(element.children[0].data);
                }

                elementText += '>\n//<![CDATA[\n';

                elementQueue = elementQueue.then(function(internalText) {

                  return elementText + internalText + '\n//]]>\n</script>';
                });

                compilationQueue = compilationQueue.then(function(html) {

                  return elementQueue.then(function(eText) {

                    return html + eText;
                  });
                });

                break;
              case 'comment':

                compilationQueue = compilationQueue.then(function(html) {

                  var match = element.data.match(/(\[[^\]]+\]>)((?:.|\n)+?)(<!\[endif\])/);

                  if (match) {
                    return flattenHTML(match[2]).then(function(conditionalHTML) {
                      return html + '<!--' + match[1] + conditionalHTML + match[3] + '-->';
                    });
                  }

                  return html + '<!--' + element.data + '-->';
                });

                break;
              case 'text':

                compilationQueue = compilationQueue.then(function(html) {

                  return html + element.data;
                });

                break;
              case 'directive':

                compilationQueue = compilationQueue.then(function(html) {

                  return html + '<' + element.data + '>';
                });

                break;
              case 'style':

                if (element.children.length && element.children[0].type === 'text') {
                  elementQueue = flattenStylesheet(element.children[0].data);
                }

                compilationQueue = compilationQueue.then(function(html) {

                  return elementQueue.then(function(internalText) {
                    var attributes = '';
                    var attribute;
                    for (attribute in element.attribs) {
                      if ({}.hasOwnProperty.call(element.attribs, attribute)) {
                        attributes += attribute + '="' + element.attribs[attribute] + '" ';
                      }
                    }
                    return html + '<style' + (attributes ? ' ' + attributes : '') + '>' + internalText + '</style>';
                  });
                });

                break;
              case 'tag':

                switch (element.name) {

                  case 'img':

                    elementText = '<img';

                    if ('attribs' in element) {

                      if (element.attribs.src) {
                        elementQueue = flattenExternalBinary(relative(resourceRoot, element.attribs.src));
                      }

                      elementText += stringifyAttributes(element.attribs, 'src');
                    }

                    compilationQueue = compilationQueue.then(function(html) {

                      return elementQueue.then(function(dataURI) {

                        return html + elementText + ' src="' + dataURI + '">';
                      });
                    });

                    break;
                  case 'link':

                    if ('attribs' in element && element.attribs.rel === 'stylesheet' && element.attribs.href) {

                      if (element.attribs.media) {
                        elementText = '<style type="text/css"> @media ' + element.attribs.media + ' {';
                        closingElementText = '}</style>';
                      } else {
                        elementText = '<style type="text/css">';
                        closingElementText = '</style>';
                      }


                      elementQueue = flattenExternalStylesheet(relative(resourceRoot, element.attribs.href));

                      compilationQueue = compilationQueue.then(function(html) {

                        return elementQueue.then(function(internalText) {

                          return html + elementText + internalText + closingElementText;
                        });
                      });
                    }
                    break;

                  case 'area':
                  case 'base':
                  case 'br':
                  case 'col':
                  case 'hr':
                  case 'param':
                  case 'meta':
                  case 'input':
                  case 'command':
                  case 'keygen':
                  case 'source':

                    elementText = '<' + element.name;

                    if ('attribs' in element) {
                      elementText += stringifyAttributes(element.attribs);
                    }

                    compilationQueue = compilationQueue.then(function(html) {

                      return html + elementText + ' />';
                    });

                    break;
                  default:

                    elementText = '<' + element.name;

                    if ('attribs' in element) {
                      elementText += stringifyAttributes(element.attribs);
                    }

                    compilationQueue = compilationQueue.then(function(html) {

                      return html + elementText + '>';
                    });

                    if ('children' in element) {
                      append(element.children);
                    }

                    compilationQueue = compilationQueue.then(function(html) {

                      return html + '</' + element.name + '>';
                    });

                    break;
                }
                break;
              default:
                break;
            }
          });
        }(dom));
      }

      result.resolve(compilationQueue);
    });
    var parser = new htmlparser.Parser(handler);

    parser.parseComplete(rawHTML);

    return result.promise;

  };
  var flattenExternalJavaScript = function(resourceLocation) {

    options.logger.info('Fetching JavaScript from %s.', resourceLocation);

    return read(resourceLocation).then(flattenJavaScript);
  };
  var flattenJavaScript = function(rawJavaScript) {
    return Bluebird.try(function() {
      try {
        return uglify.minify(rawJavaScript.toString(), {
          fromString: true,
          output: {
            inline_script: true
          }
        }).code;
      } catch ( e ) {
        options.logger.info('Failed to minify some JavaScript: ', e);

        return '';
      }
    });
  };
  var flattenExternalBinary = function(resourceLocation) {
    return Bluebird.try(function() {
      if (base64Utils.validateSync(resourceLocation)) {
        return resourceLocation;
      }

      options.logger.info('Fetching binary from %s.', resourceLocation);

      return read(resourceLocation).then(function(rawBinary) {

        return base64Utils.encode(rawBinary);
      });
    });
  };
  var flattenExternalStylesheet = function(resourceLocation, imported) {

    options.logger.info('Fetching Stylesheet from %s.', resourceLocation || 'inline node');

    return read(resourceLocation).then(function(rawCSS) {

      return flattenStylesheet(rawCSS, resourceLocation, imported);
    });
  };
  var flattenStylesheet = function(rawCSS, resourceLocation, imported) {

    options.logger.info('Flattening raw CSS from %s.', resourceLocation || 'inline style');

    var result = Bluebird.defer();
    var parser = new parserlib.css.Parser({
      starHack: true,
      underscoreHack: true,
      ieFilters: true
    });
    var compilationQueue = Bluebird.resolve('');

    parser.addListener('startsylesheet', function() {

      if (!imported) {
        compilationQueue = compilationQueue.then(function() {

          return '/* Stylesheet flattened by Collapsify */\n';
        });
      }
    });

    parser.addListener('charset', function(event) {

      if (!imported) {
        compilationQueue = compilationQueue.then(function(stylesheet) {

          return stylesheet + '@charset ' + event.charset + ';';
        });
      }
    });

    parser.addListener('namespace', function(event) {

      compilationQueue = compilationQueue.then(function(stylesheet) {

        return stylesheet + '@namespace ' + (event.prefix ? event.prefix + ' ' : '') + '"' + event.uri + '";';
      });
    });

    parser.addListener('import', function(event) {
      var uri = event.uri.replace(/^(?:url\()?["']?([^"']+?)["']?\)?$/, '$1');
      var importedStylesheetFlattens = flattenExternalStylesheet(relative(resourceLocation, uri), true);

      compilationQueue = compilationQueue.then(function(stylesheet) {

        return importedStylesheetFlattens.then(function(flattenedImportedStylesheet) {

          return stylesheet + '\n' + flattenedImportedStylesheet;
        });
      });
    });

    parser.addListener('startpage', function(event) {

      compilationQueue = compilationQueue.then(function(stylesheet) {

        return stylesheet + '@page ' + (event.pseudo ? ':' + event.pseudo : '') + '{';
      });
    });

    parser.addListener('endpage', function() {

      compilationQueue = compilationQueue.then(function(stylesheet) {

        return stylesheet + '}';
      });
    });

    parser.addListener('startpagemargin', function(event) {
      compilationQueue = compilationQueue.then(function(stylesheet) {
        return stylesheet + '@' + event.margin + '{';
      });
    });

    parser.addListener('endpagemargin', function() {
      compilationQueue = compilationQueue.then(function(stylesheet) {
        return stylesheet + '}';
      });
    });

    parser.addListener('startfontface', function() {

      compilationQueue = compilationQueue.then(function(stylesheet) {

        return stylesheet + '@font-face {';
      });
    });

    parser.addListener('endfontface', function() {

      compilationQueue = compilationQueue.then(function(stylesheet) {

        return stylesheet + '}';
      });
    });

    parser.addListener('startviewport', function() {
      compilationQueue = compilationQueue.then(function(stylesheet) {
        return stylesheet + '@viewport {';
      });
    });

    parser.addListener('endviewport', function() {
      compilationQueue = compilationQueue.then(function(stylesheet) {
        return stylesheet + '}';
      });
    });

    parser.addListener('startmedia', function(event) {

      compilationQueue = compilationQueue.then(function(stylesheet) {

        return stylesheet + '@media' + event.media.reduce(function(previous, media) {
            return (previous ? previous + ',' : '') + (media.modifier ? ' ' + media.modifier : '') + (media.mediaType ? ' ' + media.mediaType.text : '') + (media.mediaType && media.features ? ' and ' : '') + media.features.reduce(function(features, feature) {
                return (features ? features + ' and ' : '') + feature.text;
              }, '');
          }, '') + '{';
      });
    });

    parser.addListener('endmedia', function() {

      compilationQueue = compilationQueue.then(function(stylesheet) {

        return stylesheet + '}';
      });
    });

    parser.addListener('startkeyframes', function(event) {
      compilationQueue = compilationQueue.then(function(stylesheet) {
        return stylesheet + '@' + (event.prefix ? '-' + event.prefix + '-' : '') + 'keyframes ' + event.name + '{';
      });
    });

    parser.addListener('endkeyframes', function() {
      compilationQueue = compilationQueue.then(function(stylesheet) {
        return stylesheet + '}';
      });
    });

    parser.addListener('startrule', function(event) {

      compilationQueue = compilationQueue.then(function(stylesheet) {

        return stylesheet + event.selectors.map(function(selector) {
            return selector.text.replace('   ', ' ');
          }).join(',') + '{';
      });
    });

    parser.addListener('endrule', function() {

      compilationQueue = compilationQueue.then(function(stylesheet) {

        return stylesheet + '}';
      });
    });

    parser.addListener('property', function(event) {

      var propertyName = event.property.text;
      var propertyValue = event.value.text;
      var important = event.important;
      var hack = event.property.hack;
      var urlMatcher = /url\(['"]?([^'"\s]*)['"]?\)/ig;
      var binaryFlattener = [];
      var urlMatches = [];
      var match;

      while ((match = urlMatcher.exec(propertyValue))) {
        urlMatches.push(match[0]);
        binaryFlattener.push(flattenExternalBinary(relative(resourceLocation || resourceRoot, match[1])));
      }

      compilationQueue = compilationQueue.then(function(stylesheet) {
        if (!binaryFlattener.length) {
          return stylesheet + propertyName + ':' + (hack ? hack : '') + propertyValue + (important ? ' !important' : '') + ';';
        }

        return Bluebird.reduce(binaryFlattener, function(propValue, flattenedUrl, index) {
          return propValue.replace(urlMatches[index], 'url(' + flattenedUrl + ')');
        }, propertyValue).then(function(propValue) {
          return stylesheet + propertyName + ':' + (hack ? hack : '') + propValue + (important ? ' !important' : '') + ';';
        });
      });
    });

    parser.addListener('endstylesheet', function() {

      result.resolve(compilationQueue.then(function(css) {
        return new CleanCSS().minify(css);
      }));
    });

    parser.addListener('error', function(error) {

      options.logger.info('Error while parsing CSS in %s: ', resourceLocation || resourceRoot, error);
    });

    try {

      parser.parse(rawCSS);

    } catch ( e ) {

      options.logger.info('Failed to parse CSS: ', e);
      result.resolve('');

    }

    return result.promise;
  };


  return flattenExternalHTML(resourceRoot).then(function(flattened) {
    options.logger.info('Final collapsed page is %d bytes', flattened.length);
    return flattened;
  });
};
