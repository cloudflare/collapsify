var fs = require('q-fs'),
    entities = require('entities'),
    http = require('follow-redirects').http,
    https = require('follow-redirects').https,
    path = require('path'),
    zlib = require('zlib'),
    url = require('url'),
    q = require('q'),
    ref = q.ref,
    defer = q.defer,
    reject = q.reject,
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

                options.headers = JSON.parse(JSON.stringify(headers));
                options.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:11.0) Gecko/20100101 Firefox/11.0';

                requests++;

                (options.protocol == 'https:' ? https : http).get(options, function(res) {

                    var buffers = [],
                        length = 0;

                    if( res.headers['content-encoding'] == 'gzip' ) {
                        var gzip = zlib.createGunzip();
                        res.pipe(gzip);
                        response = gzip;
                    }
                    else if( res.headers['content-encoding'] == 'deflate' ) {
                        var deflate = zlib.createDeflate();
                        res.pipe(deflate);
                        response = deflate;
                    }
                    else {
                        response = res;
                    }

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
