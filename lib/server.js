var connect = require('connect'),
    mobilize = require('./mobilize');
    optimizer = mobilize(
        mobilize.inlineStylesheets(),
        mobilize.inlineJavaScripts(),
        mobilize.inlineImages(),
        mobilize.rebaseImages(),
        mobilize.minifyStylesheets(),
        mobilize.minifyJavaScripts(),
        mobilize.minifyHTML()
    );

module.exports = connect(
    connect.profiler(),
    connect.favicon(),
    connect.query(),
    optimizer.connect()
);
