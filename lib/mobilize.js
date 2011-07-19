var step = require('step'),
    jsdom = require('jsdom'),
    media = require('./media'),
    path = require('path'),
    url = require('url'),
    fs = require('fs'),
    util = require('util'),
    argv = require('optimist').argv,
    kompressor = require('htmlKompressor'),
    cssmin = require('cssmin').cssmin,
    uglify = require('uglify-js'),
    parser = uglify.parser,
    processor = uglify.uglify;

function log(out) {

    if(argv.verbose) util.log(out);
}

exports.build = function(target, callback) {
    
    var urlParts = url.parse(target, true),
        base = urlParts.protocol + '//' + urlParts.host,
        stylesheets = [],
        javaScripts = [],
        images = {},
        imageCount = 0,
        window,
        document,
        head,
        body;

    step(

        function loadTarget() {

            jsdom.env(target, this);
        },
        function grabRemoteStylesheets(error, window) {

            if(error)
                callback(error);
            else {

                var group = this.group();

                document = window.document;
                head = document.getElementsByTagName('head')[0];
                body = document.getElementsByTagName('body')[0];

                var rawStylesheets = document.getElementsByTagName('link');

                for(var index = 0; index < rawStylesheets.length; index++) {

                    if(rawStylesheets[index].getAttribute('rel') === 'stylesheet') {

                        var target = url.resolve(base, rawStylesheets[index].getAttribute('href'));
                        
                        stylesheets.push(rawStylesheets[index]);
                        media.retrieveRemoteResource(target, 'utf8', group());
                    }
                }
            }
        },
        function makeStylesheetsInline(error, rawStylesheets) {

            if(error)
                callback(error);
            else {

                // TODO: Handle inline @import directives. Right now, we probably break them..
                log('Processing ' + rawStylesheets.length + ' stylesheets..');

                rawStylesheets.forEach(
                    function(stylesheet, index) {

                        var inlineStyle = document.createElement('style');

                        log('Converting ' + stylesheets[index].getAttribute('href') + ' to an inline stylesheet..');

                        inlineStyle.textContent = stylesheet.toString();
                        inlineStyle.setAttribute('type', 'text/css');

                        stylesheets[index].parentNode.replaceChild(inlineStyle, stylesheets[index]);
                    }
                );

                this();
            }
        },

        function grabRemoteJavaScripts() {

            var group = this.group(),
                rawJavaScripts = document.getElementsByTagName('script');

            for(var index = 0; index < rawJavaScripts.length; index++) {
                
                var src = rawJavaScripts[index].getAttribute('src');

                if(src) {

                    var target = url.resolve(base, rawJavaScripts[index].getAttribute('src'));

                    javaScripts.push(rawJavaScripts[index]);
                    media.retrieveRemoteResource(target, 'utf8', group());
                }
            }
        },

        function makeJavaScriptsInline(error, rawJavaScripts) {

            if(error)
                callback(error);
            else {

                log('Processing ' + rawJavaScripts.length + ' JavaScripts..');
                rawJavaScripts.forEach(
                    function(javaScript, index) {

                        var script = javaScripts[index];

                        log('Converting ' + script.getAttribute('src') + ' to an inline script..');
                        script.removeAttribute('src');
                        script.textContent = javaScript.toString();
                    }
                );

                this();
            }
        },
        
        function processImages(error) {

            if(error)
                callback(error);
            else {

                var group = this.group(),
                    rawStylesheets = document.getElementsByTagName('style'),
                    rawImages = document.getElementsByTagName('img'),
                    mapImage = function(imageURL) {
                        
                        var resolvedURL = url.resolve(base, imageURL);

                        images[resolvedURL] = images[resolvedURL] || {};
                        images[resolvedURL][imageURL] = true;
                        imageCount++;
                    };

                for(var index = 0; index < rawStylesheets.length; index++) {
                        
                    var content = rawStylesheets[index].textContent,
                        imagePath = /:\s*url\(['"]?([\w\/\.\-]*[^(\.css)'"])['"]?\)/gi,
                        match;

                    while(match = imagePath.exec(content)) mapImage(match[1]);
                }

                for(index = 0; index < rawImages.length; index++) {

                    var src = rawImages[index].getAttribute('src');
                    if(src) mapImage(src);
                }

                if(imageCount) {

                    log('Downloading ' + imageCount + ' remote images..');
                    
                    for(var file in images) {
                        
                        media.remoteImageToDataURL(file, group());
                    }
                } else {

                    log("Didn't find any external images!");
                    this();
                }
            }
        },

        function replaceImages(error, dataImages) {

            if(error)
                callback(error);
            else {

                var stylesheets = document.getElementsByTagName('style'),
                    imageNodes = document.getElementsByTagName('img');
                
                log('Processing ' + dataImages.length + ' retrieved images..');

                dataImages.forEach(
                    function(image) {

                        var originalURLs = images[image.url];

                        for(var url in originalURLs) {

                            var matcher = new RegExp(url, 'g');

                            for(var index = 0; index < stylesheets.length; index++)
                                stylesheets[index].textContent = stylesheets[index].textContent.replace(matcher, image.dataURL);

                            for(index = 0; index < imageNodes.length; index++)
                                if(imageNodes[index].getAttribute('src') === url)
                                    imageNodes[index].setAttribute('src', image.dataURL);
                        }
                    }
                );

                this();
            }
        },

        function minifyEverything() {

            var stylesheets = document.getElementsByTagName('style'),
                javaScripts = document.getElementsByTagName('script');

            log('Minifying stylesheets..');

            for(var index = 0; index < stylesheets.length; index++) {

                try {
                        
                    stylesheets[index].textContent = cssmin(stylesheets[index].textContent);
                } catch(e) {

                    log('Error compiling stylesheet!');
                }
            }

            log('Minifying JavaScripts..');

            for(index = 0; index < javaScripts.length; index++) {

                try {

                    javaScripts[index].textContent = processor.gen_code(
                        processor.ast_squeeze(
                            processor.ast_mangle(
                                parser.parse(javaScripts[index].textContent)
                            )
                        )
                    );
                } catch(e) {

                    log('Error compiling JavaScript!');
                    //console.log(javaScripts[index].textContent);
                    //callback(e);
                }
            }

            log('Minifying HTML..');

            callback(0, kompressor(document.doctype + document.innerHTML));
        }
    );
}


