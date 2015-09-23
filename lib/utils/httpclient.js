'use strict';
var VERSION = require('../version');
var bhttp = require('bhttp');
var Rx = require('rx');
var he = require('he');
var url = require('url');
var errors = require('errors');
var Agent = require('yakaa');
var iconv = require('iconv-lite');
var assign = require('object-assign');

var httpAgent = new Agent({
  keepAlive: true
});
var httpsAgent = new Agent.SSL({
  keepAlive: true
});

function HttpClient(config) {
  config = config || {};

  var headers = assign({
    accept: '*/*',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:33.0) Gecko/20100101 Firefox/33.0 Collapsify/' + VERSION + ' node/' + process.version
  }, config.headers);

  this.config = config;
  this.follow_max = config.follow_max || 5;
  this.forbidden = RegExp(config.forbidden || 'a^', 'i');
  this.client = bhttp.session({
    headers: headers,
    followRedirects: false,
    noDecode: true
  });
}

HttpClient.prototype.fetch = function(originalURL, scheduler) {
  var self = this;
  if (!Rx.Scheduler.isScheduler(scheduler)) {
    scheduler = Rx.Scheduler.immediate;
  }

  return Rx.Observable.create(function(observer) {
    originalURL = he.decode(originalURL);

    return scheduler.scheduleRecursiveWithState({
      currentURL: originalURL,
      attempts_remaining: self.follow_max
    }, function(state, next) {
      var currentURL = state.currentURL;

      if (self.forbidden.test(currentURL)) {
        return observer.onError(new (errors.find('ForbiddenURLError'))(currentURL));
      }

      self.client.get(currentURL, {
        agent: /^https/.test(currentURL) ? httpsAgent : httpAgent
      }, function(err, res) {
        if (err) {
          return observer.onError(err);
        }

        if (res.statusCode >= 400) {
          return observer.onError(new (errors.find(res.statusCode))('HTTP ' + res.statusCode + ': ' + originalURL));
        }

        if (res.statusCode >= 300) {
          if (state.attempts_remaining > 0) {
            return next({
              currentURL: url.resolve(currentURL, res.headers.location),
              attempts_remaining: state.attempts_remaining - 1
            });
          }

          return observer.onError(new (errors.find('HTTPRedirectionError'))('The redirection limit has been reached: ' + originalURL));
        }

        // Decode into UTF-8 if the body is textual and is not already UTF-8.
        // Should be replaced by a module
        var contentType = decodeMIMEType(res.headers['content-type']);
        var body = res.body;
        if (contentType.type && contentType.type.indexOf('text/') !== -1 &&
          contentType.charset && !contentType.charset.match(/utf-?8$/i)) {
          body = iconv.decode(body, contentType.charset);
        }

        observer.onNext(body);
        observer.onCompleted();
      });
    });
  });
};

function decodeMIMEType(header) {
  if (!header) {
    return {};
  }

  var charset = 'iso-8859-1', arr = header.split(';');
  try {
    charset = arr[1].match(/charset=(.+)/)[1];
  } catch (e) {
    // empty
  }

  return {
    type: arr[0],
    charset: charset
  };
}

module.exports = HttpClient;
