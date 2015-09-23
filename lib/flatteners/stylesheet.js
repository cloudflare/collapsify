'use strict';
var Rx = require('rx');
var parserlib = require('parserlib');
var relative = require('../utils/relative');
var CleanCSS = require('clean-css');
var errors = require('errors');

module.exports = function(logger, resourceRoot, httpClient, flattenBinary) {
  function flattenExternalStylesheet(resourceLocation) {

    logger.info('Fetching Stylesheet from %s.', resourceLocation || 'inline node');

    return httpClient
      .fetch(resourceLocation)
      .flatMap(function(rawCSS) {
        return flattenStylesheet(rawCSS, resourceLocation);
      })
      .tapOnError(function(err) {
        logger.info({
          err: err
        });
      });
  }

  function flattenStylesheet(rawCSS, resourceLocation) {
    return Rx.Observable.defer(function() {
      logger.info('Flattening raw CSS from %s.', resourceLocation || 'inline style');

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
              return flattenBinary.flattenExternal(relative(resourceLocation || resourceRoot, match[1]));
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
  }

  return {
    flatten: flattenStylesheet,
    flattenExternal: flattenExternalStylesheet
  };
};
