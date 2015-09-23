'use strict';
var VERSION = require('../version');
var needle = require('needle');
var Rx = require('rx');
var he = require('he');
var url = require('url');
var errors = require('errors');
var Agent = require('agentkeepalive');

var httpAgent = new Agent();
var httpsAgent = new Agent.HttpsAgent();

function HttpClient(config) {
  config = config || {};

  this.config = config;
  this.follow_max = config.follow_max || 5;
  this.forbidden = RegExp(config.forbidden || 'a^', 'i');
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

      needle.request('GET', currentURL, null, {
        headers: self.config.headers || {},
        parse_response: false,
        compressed: true,
        connection: 'keep-alive',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:33.0) Gecko/20100101 Firefox/33.0 Collapsify/' + VERSION + ' node/' + process.version,
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

        observer.onNext(res.body);
        observer.onCompleted();
      });
    });
  });
};

module.exports = HttpClient;
