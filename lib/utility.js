var fs = require('q-fs'),
    entities = require('entities'),
    http = require('http'),
    https = require('https'),
    path = require('path'),
    url = require('url'),
    q = require('q'),
    ref = q.ref,
    defer = q.defer,
    reject = q.reject,
    verbose = 0;

Object.defineProperty(exports, 'verbosity', {
    get: function() {

        return verbose;
    },
    set: function(value) {

        verbose = value;
    }
});

var log = exports.log = function() {

    (verbose > 1) && console.log.apply(console, arguments);
};

var error = exports.error = function() {

    verbose && console.error.apply(console, arguments);
};

var dataToURL = exports.dataToURL = function(data, type) {

    try {
        return ref('data:' + (type || 'image/png') + ';base64,' + data.toString('base64'));
    } catch(e) {
        return reject(e);
    }
};

var isRemote = exports.isRemote = function(resource) {

    return /^(?:http\:|https\:)?\/\//.test(resource);
};

var read = exports.read = function(filePath) {

    return fs.exists(filePath).then(
        function(exists) {

            if(exists)
                return fs.read(filePath);

            return new Buffer('');
        }
    );
};

var get = exports.get = (function() {

    var requestQueue = [],
        maxRequests = 5,
        requests = 0;

    return function(resourceURL) {
       
        resourceURL = entities.decode(resourceURL, 2);

        var result = defer(),
            makeRequest = function() {

                var options = url.parse(resourceURL, false, true);

                options.headers = {};
                //options.headers['User-Agent'] = 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)';
                options.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:11.0) Gecko/20100101 Firefox/11.0';

                requests++;

                (options.protocol == 'https:' ? https : http).get(options, function(response) {

                    var buffers = [],
                        length = 0;

                    response.on('data', function(data) {

                        buffers.push(data);
                        length += data.length;
                    });

                    response.on('end', function() {

                        var data = new Buffer(length),
                            index = 0;

                        buffers.forEach(function(buffer) {

                            buffer.copy(data, index, 0, buffer.length);
                            index += buffer.length;
                        });

                        result.resolve(data);
                    });

                    response.on('close', function() {

                        error('Request for ' + resourceURL + ' closed unexpectedly.');
                        result.resolve(new Buffer(''));
                    });

                }).on('error', function(e) {

                    error('Failed to fetch ' + resourceURL + '. ' + e.message);
                    result.resolve(new Buffer(''));
                });
            };

        if(!maxRequests || requests < maxRequests)
            makeRequest();
        else
            requestQueue.push(makeRequest);

        result.promise.fin(function() {

            requests--;

            if(requestQueue.length)
                requestQueue.pop()();
        });

        return result.promise;
    };
})();
