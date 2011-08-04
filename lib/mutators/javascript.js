var step = require('step'),
    uglify = require('uglify-js'),
    utility = require('../utility');

exports.inlineJavaScripts = function() {

    return function(mobilize, callback) {
        
        var externalScripts = [],
            document = mobilize.document;

        step(
            function downloadExternalScripts() {

                var allScripts = document.getElementsByTagName('script'),
                    group = this.group();

                if(allScripts.length)
                    for(var index = 0; index < allScripts.length; index++) {

                        var src = allScripts[index].getAttribute('src');

                        if(src) {

                            externalScripts.push(allScripts[index]);
                            utility.retrieveRemoteResource(utility.resolve(mobilize, src), 'utf8', group());
                        }
                    }
                else
                    callback(0, mobilize);
            },
            function convertScriptsToInline(error, scripts) {

                if(error)
                    callback(error);
                else {

                    for(var index = 0; index < scripts.length; index++) {

                        externalScripts[index].setAttribute('data-src', externalScripts[index].getAttribute('src'));
                        externalScripts[index].removeAttribute('src');
                        externalScripts[index].textContent = scripts[index].toString();
                    }

                    callback(0, mobilize);
                }
            }
        );
    };
};


exports.minifyJavaScripts = function() {

    return function(mobilize, callback) {

        var document = mobilize.document,
            javaScripts = document.getElementsByTagName('script');

        for(var index = 0; index < javaScripts.length; index++) {


            if(!javaScripts[index].getAttribute('src') && javaScripts[index].textContent) {

                try {

                    javaScripts[index].textContent = uglify(javaScripts[index].textContent);
                } catch(e) {

                    javaScripts[index].textContent = '/* MINIFICATION FAILED */\n' + javaScripts[index].textContent;
                }
            }
        }

        process.nextTick(function() { callback(0, mobilize); });

    };
};
