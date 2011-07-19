var connect = require('connect'),
    argv = require('optimist').argv,
    mobilize = require('./build'),
    passThrough = function(req, res, next) { next(); };

module.exports = connect(
    
    argv.verbose ? connect.profiler() : passThrough,
    connect.favicon(),
    connect.query(),
    function(req, res) {

        var url = req.query.url,
            imageRoot = req.query.imageroot;

        if(url) {

            mobilize(
                url,
                imageRoot,
                function(error, page) {

                    if(error) res.end(error.stack);
                    else {
                        res.writeHead(200, { 'Content-Type' : 'text/plain' });
                        res.end(page);
                    }
                }
            );
        } else res.end('Invalid path specified.');
    }
);
