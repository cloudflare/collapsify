'use strict';
var Rx = require('rx');
var domelementtype = require('domelementtype');
var CollapsifyDOMHandler = require('../utils/CollapsifyDOMHandler');
var stringifyAttributes = require('../utils/stringifyAttributes');
var relative = require('../utils/relative');
var htmlparser = require('htmlparser2');
var errors = require('errors');

module.exports = function(logger, resourceRoot, httpClient, flattenJavaScript, flattenStylesheet, flattenBinary) {
  function flattenExternalHTML(resourceLocation) {

    logger.info('Getting HTML from %s', resourceLocation);

    return httpClient
      .fetch(resourceLocation)
      .flatMap(flattenHTML)
      .tapOnError(function(err) {
        logger.info({
          err: err
        });
      });
  }

  function flattenHTML(rawHTML, partial) {
    return Rx.Observable.defer(function() {
      var handler = new CollapsifyDOMHandler();

      var workers = {
        opentag: function(element) {
          var hotwork;

          // Flatten <script> with an external source.
          if (element.type === domelementtype.Script && element.attrs.src) {
            hotwork = flattenJavaScript.flattenExternal(relative(resourceRoot, element.attrs.src))
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
            hotwork = flattenStylesheet.flattenExternal(relative(resourceRoot, element.attrs.href))
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
            hotwork = flattenBinary.flattenExternal(relative(resourceRoot, element.attrs.src))
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
            hotwork = flattenStylesheet.flatten(element.data)
              .replay();

            hotwork.connect();
            return hotwork;
          }

          // Flatten <script> tags that contain text.
          if (element.parent && element.parent.name === 'script') {
            hotwork = flattenJavaScript.flatten(element.data)
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
  }

  return {
    flatten: flattenHTML,
    flattenExternal: flattenExternalHTML
  };
};
