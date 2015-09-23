'use strict';
var htmlparser = require('htmlparser2');
var parserlib = require('parserlib');
var uglify = require('uglify-js');
var CleanCSS = require('clean-css');
var url = require('url');
var Bluebird = require('bluebird');
var Rx = require('rx');
var base64Utils = require('./utils/base64');
var HTTPClient = require('./utils/httpclient');

// Register our custom errors. :(
require('./utils/errors');
var errors = require('errors');

module.exports = function(resourceRoot, options) {
  var httpClient = new HTTPClient(options);
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

    return httpClient
      .fetch(resourceLocation)
      .flatMap(flattenHTML)
      .tapOnError(function(err) {
        options.logger.info({
          err: err
        });
      });
  };
  var flattenHTML = function(rawHTML) {

    rawHTML = rawHTML.toString();

    var result = Bluebird.defer();
    var compilationQueue = Bluebird.resolve('');
    var handler = new htmlparser.DomHandler(function(error, dom) {

      if (error) {
        result.reject(new (errors.find('HTMLParserError'))({
          cause: error
        }));
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
                    elementQueue = flattenExternalJavaScript(relative(resourceRoot, element.attribs.src))
                      .catch(function() {
                        return Rx.Observable.return('');
                      })
                      .toPromise(Bluebird);
                  }

                  elementText += stringifyAttributes(element.attribs, 'src');
                }

                if (!(('attribs' in element) && element.attribs.src) && 'children' in element && (typeof element.children[0] !== 'undefined' && element.children[0].type === 'text')) {

                  options.logger.info('Handling inline script text!');

                  elementQueue = flattenJavaScript(element.children[0].data).toPromise(Bluebird);
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
                    }, function() {
                      return html;
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
                  elementQueue = flattenStylesheet(element.children[0].data).toPromise(Bluebird);
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
                  }, function() {
                    return html;
                  });
                });

                break;
              case 'tag':

                switch (element.name) {

                  case 'img':

                    elementText = '<img';

                    if ('attribs' in element) {

                      if (element.attribs.src) {
                        elementQueue = flattenExternalBinary(relative(resourceRoot, element.attribs.src))
                          .catch(function() {
                            return Rx.Observable.return('');
                          })
                          .toPromise(Bluebird);
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


                      elementQueue = flattenExternalStylesheet(relative(resourceRoot, element.attribs.href))
                        .catch(function() {
                          return Rx.Observable.return('');
                        })
                        .toPromise(Bluebird);

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

    return httpClient
      .fetch(resourceLocation)
      .flatMap(flattenJavaScript)
      .tapOnError(function(err) {
        options.logger.info({
          err: err
        });
      });
  };
  var flattenJavaScript = function(rawJavaScript) {
    try {
      return Rx.Observable.return(uglify.minify(rawJavaScript + '', {
        fromString: true,
        output: {
          inline_script: true
        }
      }).code);
    } catch(e) {
      return Rx.Observable.return(rawJavaScript);
    }
  };
  var flattenExternalBinary = function(resourceLocation) {
    if (base64Utils.validateSync(resourceLocation)) {
      return Rx.Observable.return(resourceLocation);
    }

    options.logger.info('Fetching binary from %s.', resourceLocation);

    return httpClient
      .fetch(resourceLocation)
      .flatMap(function(rawBinary) {
        return base64Utils.encode(rawBinary);
      })
      .tapOnError(function(err) {
        options.logger.info({
          err: err
        });
      });
  };
  var flattenExternalStylesheet = function(resourceLocation) {

    options.logger.info('Fetching Stylesheet from %s.', resourceLocation || 'inline node');

    return httpClient
      .fetch(resourceLocation)
      .flatMap(function(rawCSS) {
        return flattenStylesheet(rawCSS, resourceLocation);
      })
      .tapOnError(function(err) {
        options.logger.info({
          err: err
        });
      });
  };
  var flattenStylesheet = function(rawCSS, resourceLocation) {
    return Rx.Observable.defer(function() {
      options.logger.info('Flattening raw CSS from %s.', resourceLocation || 'inline style');

      var parser = new parserlib.css.Parser({
        starHack: true,
        underscoreHack: true,
        ieFilters: true
      });

      var end = Rx.Observable.fromEvent(parser, 'endstylesheet');

      var workers = {
        charset: function(event) {
          return Rx.Observable.return('@charset ' + event.charset + ';', Rx.Scheduler.currentThread);
        },
        namespace: function(event) {
          return Rx.Observable.return('@namespace ' + (event.prefix ? event.prefix + ' ' : '') + '"' + event.uri + '";', Rx.Scheduler.currentThread);
        },
        'import': function(event) {
          var uri = event.uri.replace(/^(?:url\()?["']?([^"']+?)["']?\)?$/, '$1');

          var hotwork = flattenExternalStylesheet(relative(resourceLocation || resourceRoot, uri))
            .replay();

          hotwork.connect();
          return hotwork;
        },
        startpage: function(event) {
          return Rx.Observable.return('@page ' + (event.pseudo ? ':' + event.pseudo : '') + '{', Rx.Scheduler.currentThread);
        },
        endpage: function() {
          return Rx.Observable.return('}', Rx.Scheduler.currentThread);
        },
        startpagemargin: function(event) {
          return Rx.Observable.return('@' + event.margin + '{', Rx.Scheduler.currentThread);
        },
        endpagemargin: function() {
          return Rx.Observable.return('}', Rx.Scheduler.currentThread);
        },
        startfontface: function() {
          return Rx.Observable.return('@font-face {', Rx.Scheduler.currentThread);
        },
        endfontface: function() {
          return Rx.Observable.return('}', Rx.Scheduler.currentThread);
        },
        startviewport: function() {
          return Rx.Observable.return('@viewport {', Rx.Scheduler.currentThread);
        },
        endviewport: function() {
          return Rx.Observable.return('}', Rx.Scheduler.currentThread);
        },
        startmedia: function(event) {
          return Rx.Observable.return('@media' + event.media.reduce(function(previous, media) {
              return (previous ? previous + ',' : '') + (media.modifier ? ' ' + media.modifier : '') + (media.mediaType ? ' ' + media.mediaType.text : '') + (media.mediaType && media.features ? ' and ' : '') + media.features.reduce(function(features, feature) {
                  return (features ? features + ' and ' : '') + feature.text;
                }, '');
            }, '') + '{', Rx.Scheduler.currentThread);
        },
        endmedia: function() {
          return Rx.Observable.return('}', Rx.Scheduler.currentThread);
        },
        startkeyframes: function(event) {
          return Rx.Observable.return('@' + (event.prefix ? '-' + event.prefix + '-' : '') + 'keyframes ' + event.name + '{', Rx.Scheduler.currentThread);
        },
        endkeyframes: function() {
          return Rx.Observable.return('}', Rx.Scheduler.currentThread);
        },
        startrule: function(event) {
          return Rx.Observable.return(event.selectors.map(function(selector) {
              return selector.text.replace('   ', ' ');
            }).join(',') + '{', Rx.Scheduler.currentThread);
        },
        endrule: function() {
          return Rx.Observable.return('}', Rx.Scheduler.currentThread);
        },
        startkeyframesrule: function(event) {
          return Rx.Observable.return(event.selectors.map(function(selector) {
              return selector.text.replace('   ', ' ');
            }).join(',') + '{', Rx.Scheduler.currentThread);
        },
        endkeyframesrule: function() {
          return Rx.Observable.return('}', Rx.Scheduler.currentThread);
        },
        property: function(event) {
          var propertyName = event.property.text;
          var propertyValue = event.value.text;
          var important = event.important;
          var hack = event.property.hack;

          var scheduler = Rx.Scheduler.immediate;

          var matchedURLs = Rx.Observable.create(function(observer) {
            var urlMatcher = /url\(['"]?([^'"\s]*)['"]?\)/ig;

            return scheduler.scheduleRecursive(function(self) {
              var match = urlMatcher.exec(propertyValue);

              if (match) {
                observer.onNext([match[0], match[1]]);
                self();
                return;
              }

              observer.onCompleted();
            });
          })
            .flatMap(function(match) {
              return flattenExternalBinary(relative(resourceLocation || resourceRoot, match[1]));
            }, function(match, binary) {
              return {
                match: match[0],
                binary: binary
              };
            });

          var hotwork = matchedURLs
            .reduce(function(propValue, match) {
              return propValue.replace(match.match, 'url(' + match.binary + ')', Rx.Scheduler.currentThread);
            }, propertyValue)
            .map(function(propValue) {
              return propertyName + ':' + (hack ? hack : '') + propValue + (important ? ' !important' : '') + ';';
            })
            .replay();

          hotwork.connect();

          return hotwork;
        }
      };

      var eventObservables = Object.keys(workers).map(function(eventName) {
        return Rx.Observable.fromEvent(parser, eventName)
          .takeUntil(end)
          .map(function(event) {
            return {
              type: eventName,
              event: event
            };
          });
      });

      var hotworker = Rx.Observable
        .merge(eventObservables)
        .concatMap(function(d) {
          if (workers[d.type]) {
            return workers[d.type](d.event);
          }

          throw new (errors.find('UnknownWorkerError'))('Unknown CSS worker "' + d.type + '"');
        })
        .reduce(function(acc, str) {
          return acc + str;
        }, '')
        .map(function(flattenedCSS) {
          return new CleanCSS().minify(flattenedCSS).styles;
        })
        .replay();

      hotworker.connect();

      parser.parse(rawCSS);

      return hotworker;
    });
  };


  return flattenExternalHTML(resourceRoot).tap(function(flattened) {
    options.logger.info('Final collapsed page is %d bytes', flattened.length);
  });
};
