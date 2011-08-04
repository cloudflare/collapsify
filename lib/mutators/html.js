var utility = require('../utility'),
    jsdom = require('jsdom'),
    step = require('step'),
    kompressor = require('htmlKompressor');

jsdom.defaultDocumentFeatures = {
    FetchExternalResources: false,
    ProcessExternalResources: false,
    MutationEvents: false,
    QuerySelector: ['1.0']
};

exports.createDocument = function() {

    return function(mobilize, callback) {

        utility.log('Creating document..');
        step(
            function() {

                jsdom.env(mobilize.url, this);
            },
            function(error, window) {

                if(error)
                    callback(error, mobilize);
                else {

                    mobilize.document = window.document;

                    callback(0, mobilize);
                }
            }
        );
    };
};

exports.renderDocument = function() {

    return function(mobilize, callback) {

        utility.log('Rendering document..');

        process.nextTick(
            function() {

                try {

                    callback(0, utility.renderDocument(mobilize.document));
                } catch(e) {

                    callback(e, mobilize);
                }
            }
        );
    };
};

exports.minifyHTML = function() {

    return function(mobilize, callback) {

        var document = mobilize.document;

        step(

            function minifyHTML() {

                var html = document.doctype + document.innerHTML;

                try {

                    html = kompressor(html);
                } catch(e) {

                    html = '<!-- MINIFICATION FAILED -->\n' + html;
                }

                jsdom.env(html, this);
            },
            function resolveDocument(error, window) {

                if(error)
                    callback(error);
                else {

                    mobilize.document = window.document;
                    callback(0, mobilize);
                }
            }
        );
    };
};
