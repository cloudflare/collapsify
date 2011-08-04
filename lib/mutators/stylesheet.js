var step = require('step'),
    cssmin = require('cssmin').cssmin,
    utility = require('../utility');

exports.inlineStylesheets = function() {

    return function(mobilize, callback) {

        var externalStylesheets = [],
            document = mobilize.document;

        step(
            function downloadExternalStylesheets() {

                var allLinks = document.getElementsByTagName('link'),
                    stylesheetCount = 0,
                    group = this.group();

                for(var index = 0; index < allLinks.length; index++) {

                    var rel = allLinks[index].getAttribute('rel'),
                        href = allLinks[index].getAttribute('href');

                    if(rel === 'stylesheet' && href) {

                        utility.log('Stashing stylesheet ' + href);
                        stylesheetCount++;
                        externalStylesheets.push(allLinks[index]);
                        utility.retrieveRemoteResource(utility.resolve(mobilize, href), 'utf8', group());
                    }
                }

                if(!stylesheetCount) callback(0, mobilize);
            },
            function convertStylesheetsToInline(error, stylesheets) {

                if(error)
                    callback(error, mobilize);
                else {

                    for(var index = 0; index < externalStylesheets.length; index++) {

                        var styleNode = document.createElement('style');

                        styleNode.textContent = stylesheets[index].toString();
                        styleNode.setAttribute('type', 'text/css');
                        styleNode.setAttribute('ref', externalStylesheets[index].getAttribute('href'));

                        externalStylesheets[index].parentNode.replaceChild(styleNode, externalStylesheets[index]);
                    }

                    callback(0, mobilize);
                }
            }
        );
    };
};

exports.minifyStylesheets = function() {

    return function(mobilize, callback) {

        var document = mobilize.document,
            stylesheets = document.getElementsByTagName('style');

        for(var index = 0; index < stylesheets.length; index++) {

            try {

                stylesheets[index].textContent = cssmin(stylesheets[index].textContent || '');
            } catch(e) {

                stylesheets[index].textContent = '/* MINIFICATION FAILED */\n' + stylesheets[index].textContent;
            }
        }

        process.nextTick(function() { callback(0, mobilize); });
    }
};
