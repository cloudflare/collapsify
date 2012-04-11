
var express = require('express'),
    collapsify = require('./collapsify').collapsify,
    utility = require('./utility');

var middleware = exports.middleware = function(options) {

    return function(req, res, next) {

        if(req.query && 'url' in req.query) {

            collapsify(req.query.url, options).then(function(result) {

                res.end(result);
            }, function(error) {

                res.end("Failed to collapsify " + req.query.url + (error ? ". " +  error.message : ''));
            });
        } else
            next();
    }
};

var startServer = exports.startServer = function(options) {

    var app = express.createServer();

    app .use(express.query())
        .use(middleware());

    console.log("Starting Collapsify (process " + process.pid + ") on " + (options.h ? options.h : '') + ':' + options.p);

    return app.listen(options.p, options.h);
}

