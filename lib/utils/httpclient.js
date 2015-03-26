'use strict';
var VERSION = require('../version');
var Restler = require('restler');
var he = require('he');
var Bluebird = require('bluebird');
var httperr = require('httperr');

module.exports = Restler.service(function(headers) {
  Object.keys(headers || {}).forEach(function(key) {
    this.defaults.headers[key] = headers[key];
  }, this);
}, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:33.0) Gecko/20100101 Firefox/33.0 Collapsify/' + VERSION + ' node/' + process.version
  }
}, {
  fetch: function(url) {
    return Bluebird.try(function() {
      url = he.decode(url);

      return new Bluebird(function(resolve, reject) {
        this
          .get(url)
          .on('success', function(data, resp) {
            resolve(resp.raw);
          })
          .on('fail', function(data, resp) {
            reject(httperr[resp.statusCode](url));
          })
          .on('error', function(err) {
            reject(err);
          });
      }.bind(this));
    }, [], this);
  }
});
