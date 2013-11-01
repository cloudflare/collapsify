var fs = require('q-io/fs'),
    he = require('he'),
    restler = require('restler'),
    path = require('path'),
    Q = require('q'),
    verbose = 0,
    headers = {};

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

var isBase64 = exports.isBase64 = function(string) {
    return /^['"]?data:[^;]*;base64/.test(string);
};

var log = exports.log = function() {
    (verbose > 1) && console.log.apply(console, arguments);
};

var error = exports.error = function() {
    verbose && console.error.apply(console, arguments);
};

var dataToURL = exports.dataToURL = Q.fbind(function(data, type) {

    return 'data:' + (type || 'image/png') + ';base64,' + data.toString('base64');
});

var isRemote = exports.isRemote = function(resource) {
    return /^(?:http\:|https\:)?\/\//.test(resource);
};

var read = exports.read = function(filePath) {

    return fs.exists(filePath).then(
        function(exists) {

            if(exists)
                return fs.read(filePath, "b");

            return new Buffer('');
        }
    );
};

var get = exports.get = (function() {

    return function(resourceURL) {

        resourceURL = he.decode(resourceURL);

            return Q.promise(function(resolve, reject) {

                var options = {};

                options.headers = JSON.parse(JSON.stringify(headers));
                options.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:11.0) Gecko/20100101 Firefox/11.0';

                restler.get(resourceURL, options).on('complete', function(data, resp) {
                  if (data instanceof Error) {
                    return resolve(new Buffer(''));
                  }
                  resolve(resp.raw);
                });
            });
    };
})();
