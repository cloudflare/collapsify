'use strict';
var htmlparser = require('htmlparser2');
var parserlib = require('parserlib');
var uglify = require('uglify-js');
var CleanCSS = require('clean-css');
var url = require('url');
var Rx = require('rx');
var base64Utils = require('./utils/base64');
var HTTPClient = require('./utils/httpclient');
var CollapsifyDOMHandler = require('./utils/CollapsifyDOMHandler');
var stringifyAttributes = require('./utils/stringifyAttributes');
var domelementtype = require('domelementtype');

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

  var flattenHTML = function(rawHTML, partial) {
    return Rx.Observable.defer(function() {
      var handler = new CollapsifyDOMHandler();

      var workers = {
        opentag: function(element) {
          var hotwork;

          // Flatten <script> with an external source.
          if (element.type === domelementtype.Script && element.attrs.src) {
            hotwork = flattenExternalJavaScript(relative(resourceRoot, element.attrs.src))
              .flatMap(function(js) {
                return Rx.Observable.return('<script' + stringifyAttributes(element.attrs || {}, ['src']) + '>' + js, Rx.Scheduler.currentThread);
              })
              .replay();

            hotwork.connect();
            return hotwork;
          }

          // Flatten <link> external stylesheets
          if (element.name === 'link' && element.attrs.rel === 'stylesheet' && element.attrs.href) {
            element.name = 'style';
            hotwork = flattenExternalStylesheet(relative(resourceRoot, element.attrs.href))
              .flatMap(function(css) {
                if (element.attrs.media) {
                  css = '@media ' + element.attrs.media + '{' + css + '}';
                }

                return Rx.Observable.return('<style type="text/css"' + stringifyAttributes(element.attrs || {}, ['media', 'href', 'type']) + '>' + css, Rx.Scheduler.currentThread);
              })
              .replay();

            hotwork.connect();
            return hotwork;
          }

          // Flatten <img> tags
          if (element.name === 'img' && element.attrs.src) {
            hotwork = flattenExternalBinary(relative(resourceRoot, element.attrs.src))
              .flatMap(function(binary) {
                return Rx.Observable.return('<img src="' + binary + '"' + stringifyAttributes(element.attrs || {}, ['src']) + '>', Rx.Scheduler.currentThread);
              })
              .replay();

            hotwork.connect();
            return hotwork;
          }

          // We decoded into UTF8, so clean up the meta tags
          if (element.name === 'meta') {
            if (element.attrs.charset) {
              element.attrs.charset = 'utf-8';
            }

            if (element.attrs['http-equiv'] && element.attrs['http-equiv'].toLowerCase() === 'content-type') {
              element.attrs.content = 'text/html; charset=utf-8';
            }
          }

          return Rx.Observable.return('<' + element.name + stringifyAttributes(element.attrs || {}) + '>', Rx.Scheduler.currentThread);
        },
        closetag: function(element) {
          var voidElements = [
            'area',
            'base',
            'br',
            'col',
            'command',
            'embed',
            'hr',
            'img',
            'input',
            'keygen',
            'link',
            'meta',
            'param',
            'source',
            'track',
            'wbr'
          ];

          // If the element is void, it does not need a closing tag.
          if (voidElements.indexOf(element.name) >= 0) {
            return Rx.Observable.return('');
          }

          return Rx.Observable.return('</' + element.name + '>', Rx.Scheduler.currentThread);
        },
        text: function(element) {
          var hotwork;

          // Flatten inline <style> tags
          if (element.parent && element.parent.name === 'style') {
            hotwork = flattenStylesheet(element.data)
              .replay();

            hotwork.connect();
            return hotwork;
          }

          // Flatten <script> tags that contain text.
          if (element.parent && element.parent.name === 'script') {
            hotwork = flattenJavaScript(element.data)
              .replay();

            hotwork.connect();
            return hotwork;
          }

          // Otherwise return the data as simple text.
          return Rx.Observable.return(element.data, Rx.Scheduler.currentThread);
        },
        processinginstruction: function(element) {
          // HTML directives, most commonly <!doctype>
          return Rx.Observable.return('<' + element.data + '>', Rx.Scheduler.currentThread);
        },
        opencomment: function(element) {
          var match = element.data.match(/(\[[^\]]+\]>)((?:.|\n|\r)+?)(<!\[endif\])/);
          var hotwork;

          // Matches and IE conditional
          if (match) {
            hotwork = flattenHTML(match[2], true)
              .flatMap(function(conditionalHTML) {
                return Rx.Observable.return('<!--' + match[1] + conditionalHTML + match[3] + '-->', Rx.Scheduler.currentThread);
              })
              .replay();

            hotwork.connect();
            return hotwork;
          }

          return Rx.Observable.return('<!--' + element.data + '-->', Rx.Scheduler.currentThread);
        },
        onerror: function(err) {
          return Rx.Observable.throw(new (errors.find('HTMLParserError'))({
            cause: err
          }), Rx.Scheduler.currentThread);
        }
      };

      var hotworker = handler.process
        .concatMap(function(d) {
          if (workers[d.type]) {
            return workers[d.type](d.elem);
          }

          throw new (errors.find('UnknownWorkerError'))('Unknown HTML worker "' + d.type + '"');
        })
        .reduce(function(acc, str) {
          return acc + str;
        }, '')
        .replay();

      hotworker.connect();

      var parser = new htmlparser.Parser(handler, {
        decodeEntities: true,
        recognizeSelfClosing: true
      });

      if (!partial) {
        parser.parseComplete(rawHTML);
      } else {
        parser.reset();
        parser.write(rawHTML);
        handler.onend();
      }

      return hotworker;
    });
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
