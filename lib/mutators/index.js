var html = require('./html'),
    image = require('./image'),
    javascript = require('./javascript'),
    stylesheet = require('./stylesheet');

exports.minifyHTML = html.minifyHTML;

exports.minifyJavaScripts = javascript.minifyJavaScripts;
exports.inlineJavaScripts = javascript.inlineJavaScripts;

exports.minifyStylesheets = stylesheet.minifyStylesheets;
exports.inlineStylesheets = stylesheet.inlineStylesheets;

exports.inlineImages = image.inlineImages;
exports.rebaseImages = image.rebaseImages;
