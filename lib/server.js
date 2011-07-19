var connect = require('connect'),
    argv = require('optimist').argv,
    mobilize = require('../lib/mobilize'),
    passThrough = function(req, res, next) { next(); };

exports = module.exports = connect(
    
    argv.verbose ? connect.profiler() : passThrough,
    connect.favicon(),
    connect.query(),
    function(req, res) {

        var url = req.query.url;

        if(url) {

            mobilize.build(
                url,
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
