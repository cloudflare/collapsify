'use strict';
var htmlparser = require('htmlparser2');
var parserlib = require('parserlib');
var uglify = require('uglify-js');
var CleanCSS = require('clean-css');
var url = require('url');
var path = require('path');
var utility = require('./utility');
var Q = require('q');
var defer = Q.defer;
var mimeTypes = {
  png: 'image/png',
  jpg: 'image/jpg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  tiff: 'image/tiff',
  otf: 'font/opentype',
  ttf: 'font/truetype',
  woff: 'font/woff',
  eot: 'font/eot',
  svg: 'image/svg+xml'
};

exports.collapsify = function(resourceRoot, options) {
  var read = function(resourceURL) {
    var re = RegExp(options.forbidden, 'i');

    if (re.test(resourceURL)) {
      return Q('');
    }

    return utility.get(resourceURL);
  };
  var relative = function(from, to) {

    if (!utility.isBase64(from) && !utility.isBase64(to)) {
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

    utility.log('Getting HTML from ' + resourceLocation);

    return read(resourceLocation).then(flattenHTML);
  };
  var flattenHTML = function(rawHTML) {

    rawHTML = rawHTML.toString();

    var result = defer();
    var compilationQueue = Q('');
    var handler = new htmlparser.DomHandler(function(error, dom) {

      if (error) {
        result.reject(error);
      } else {
        (function append(elements) {

          utility.log('Appending ' + elements.length + ' elements: ' + elements.map(function(element) {
            return element.name || element.type;
          }).join(', '));

          elements.forEach(function(element) {

            utility.log('Handling ' + (element.name || element.type));

            var elementQueue = Q('');
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

                if (!(('attribs' in element) && element.attribs.src ) && 'children' in element && (typeof element.children[0] !== 'undefined' && element.children[0].type === 'text')) {

                  utility.log('Handling inline script text!');

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

    utility.log('Fetching JavaScript from ' + resourceLocation);

    return read(resourceLocation).then(flattenJavaScript);
  };
  var flattenJavaScript = Q.fbind(function(rawJavaScript) {

    try {
      return uglify.minify(rawJavaScript.toString(), {
        fromString: true,
        output: {
          inline_script: true
        }
      }).code;
    } catch ( e ) {

      utility.log('Failed to minify some JavaScript. ' + e.message);

      return '';
    }
  });
  var flattenExternalBinary = Q.fbind(function(resourceLocation) {

    if (utility.isBase64(resourceLocation)) {
      return resourceLocation;
    }

    utility.log('Fetching binary from ' + resourceLocation);

    return read(resourceLocation).then(function(rawBinary) {

      var extension = path.extname(url.parse(resourceLocation).pathname).slice(1) || 'png';
      return utility.dataToURL(rawBinary, mimeTypes[extension]);
    });
  });
  var flattenExternalStylesheet = function(resourceLocation, imported) {

    utility.log('Fetching Stylesheet from ' + (resourceLocation || 'inline node.'));

    return read(resourceLocation).then(function(rawCSS) {

      return flattenStylesheet(rawCSS, resourceLocation, imported);
    });
  };
  var flattenStylesheet = function(rawCSS, resourceLocation, imported) {

    utility.log('Flattening raw CSS from ' + (resourceLocation || 'inline style'));

    var result = defer();
    var parser = new parserlib.css.Parser({
      starHack: true,
      underscoreHack: true,
      ieFilters: true
    });
    var compilationQueue = Q('');

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

        if (binaryFlattener.length) {
          return Q.all(binaryFlattener).then(function() {
            binaryFlattener.map(function(flattenedUrl, index) {
              propertyValue = propertyValue.replace(urlMatches[index], 'url(' + flattenedUrl + ')');
            });
            return stylesheet + propertyName + ':' + (hack ? hack : '') + propertyValue + (important ? ' !important' : '') + ';';
          });
        }
        return stylesheet + propertyName + ':' + (hack ? hack : '') + propertyValue + (important ? ' !important' : '') + ';';
      });
    });

    parser.addListener('endstylesheet', function() {

      result.resolve(compilationQueue.then(function(css) {
        return new CleanCSS().minify(css);
      }));
    });

    parser.addListener('error', function(error) {

      utility.log('Error while parsing CSS in ' + (resourceLocation || resourceRoot) + ': ' + error.message);
    });

    try {

      parser.parse(rawCSS);

    } catch ( e ) {

      utility.log('Failed to parse CSS. ' + e.message);
      result.resolve('');

    }

    return result.promise;
  };

  if (options.H) {
    utility.headers = options.H;
  }


  return flattenExternalHTML(resourceRoot).then(function(flattened) {

    utility.log('Final collapsed page is ' + flattened.length + ' bytes.');
    return flattened;
  });
};
