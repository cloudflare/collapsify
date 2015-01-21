'use strict';
var fs = require('q-io/fs');
var he = require('he');
var restler = require('restler');
var Q = require('q');
var verbose = 0;
var headers = {};

Object.defineProperty(exports, 'verbosity', {
  get: function() {

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

exports.log = function() {
  if (verbose > 1) {
    console.log.apply(console, arguments);
  }
};

exports.error = function() {
  if (verbose) {
    console.error.apply(console, arguments);
  }
};

exports.dataToURL = Q.fbind(function(data, type) {

  return 'data:' + (type || 'image/png') + ';base64,' + data.toString('base64');
});

exports.isRemote = function(resource) {
  return /^(?:http\:|https\:)?\/\//.test(resource);
};

exports.read = function(filePath) {

  return fs.exists(filePath).then(function(exists) {

    if (exists) {
      return fs.read(filePath, 'b');
    }

    return new Buffer('');
  });
};

exports.get = (function() {

  return function(resourceURL) {

    resourceURL = he.decode(resourceURL);

    return Q.promise(function(resolve) {

      var options = {};

      options.headers = JSON.parse(JSON.stringify(headers));
      options.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:11.0) Gecko/20100101 Firefox/11.0';

      restler.get(resourceURL, options).on('complete', function(data, resp) {
        if (data instanceof Error || resp.statusCode === 404) {
          return resolve(new Buffer(''));
        }
        resolve(resp.raw);
      });
    });
  };
}());
