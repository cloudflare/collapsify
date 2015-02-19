'use strict';
var he = require('he');
var restler = require('restler');
var Bluebird = require('bluebird');
var verbose = 0;
var headers = {};

Object.defineProperty(exports, 'verbosity', {
  get: function() {
    console.log('verbosity!');
    return verbose;
  },
  set: function(value) {

    verbose = value;
  }
});

Object.defineProperty(exports, 'headers', {
  get: function() {

    return headers;
  },
  set: function(value) {

    headers = value;
  }
});

exports.isBase64 = function(string) {
  return /^['"]?data:[^;]*;base64/.test(string);
};

exports.dataToURL = function(data, type) {
  return Bluebird.try(function() {
    return 'data:' + (type || 'image/png') + ';base64,' + data.toString('base64');
  });
};

exports.isRemote = function(resource) {
  return /^(?:http\:|https\:)?\/\//.test(resource);
};

exports.get = function(resourceURL) {
  return Bluebird.try(function() {
    resourceURL = he.decode(resourceURL);

    return new Bluebird(function(resolve) {
        var options = {
          headers: JSON.parse(JSON.stringify(headers))
        };

        options.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:11.0) Gecko/20100101 Firefox/11.0';

        restler.get(resourceURL, options)
          .on('success', function(data, resp) {
            resolve(resp.raw);
          })
          .on('complete', function() {
            resolve(new Buffer(''));
          });
      });
  });
};
