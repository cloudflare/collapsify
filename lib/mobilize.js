var step = require('step'),
    mutators = require('./mutators'),
    html = require('./mutators/html'),
    url = require('url');

exports = module.exports = function() {

    var middleware = Array.prototype.map.call(
            arguments, 
            function(mutator, index) {

                return function(error, mobilize) {

                    if(error)
                        throw error;
                    else
                        mutator(mobilize, this);
                };
            }
        ),
        optimize = function(mobilize, callback) {

            var optimizerStack = middleware.slice();
            
            optimizerStack.unshift(
                function() {
                    
                    html.createDocument()(mobilize, this);
                }
            );

            optimizerStack.push(callback);

            step.apply(step, optimizerStack);
        },
        connect = function(options) {
           
            options = options || {};

            var param = options.param || 'url',
                query = options.query || 'url',
                path = options.path || '/',
                pathTest = new RegExp('^' + path + '$', 'i');

            return function(req, res, next) {

                var requestPath = url.parse(req.url).pathname;

                if(pathTest.test(requestPath) && ('params' in req && req.params.url) || ('query' in req && req.query.url))

                    optimize(
                        { 
                            url: req.params && req.params.url || req.query && req.query.url,
                            imageBase: req.params && req.params.imagebase || req.query && req.query.imagebase || null
                        },
                        function(error, html) {

                            res.end(html || error && error.stack || 'Empty result.');
                        }
                    );
                else
                    next();
                    
            };
        };

    middleware.push(
        function(error, mobilize) {

            if(error)
                throw error;
            else
                html.renderDocument()(mobilize, this);
        }
    );


    return {
        optimize: optimize,
        connect: connect
    };
};

exports.inlineJavaScripts = mutators.inlineJavaScripts;
exports.inlineStylesheets = mutators.inlineStylesheets;
exports.inlineImages = mutators.inlineImages;
exports.rebaseImages = mutators.rebaseImages;
exports.minifyJavaScripts = mutators.minifyJavaScripts;
exports.minifyStylesheets = mutators.minifyStylesheets;
exports.minifyHTML = mutators.minifyHTML;

exports.passThrough = function(mobilize, callback) { callback(0, mobilize); };
