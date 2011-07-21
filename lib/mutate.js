var step = require('step'),
    jsdom = require('jsdom'),
    url = require('url'),
    path = require('path'),
    kompressor = require('htmlKompressor'),
    cssmin = require('cssmin').cssmin,
    uglify = require('uglify-js'),
    media = require('./media'),
    utility = require('./utility');

exports.createMutator = function(documentURL, document, callback) {

    var uriParts = url.parse(documentURL),
        base = uriParts.protocol + '//' + uriParts.hostname + (uriParts.path || ''),
        imagePath = /url\(['"]?([^\)]*[^(\.css)'"])['"]?\)/gi,
        resolve = function(path) {
            
            return url.resolve(base, path);
        },
        mapImages = function() {

            var imageMap = { length: 0 },
                mapImage = function(imageURL, alternateBase) {
                    
                    resolvedURL = alternateBase ? url.resolve(resolve(alternateBase), imageURL) : resolve(imageURL);

                    imageMap[resolvedURL] = imageMap[resolvedURL] || {};
                    imageMap[resolvedURL][imageURL] = true;
                    imageMap.length++;
                },
                stylesheets = document.getElementsByTagName('style'),
                images = document.getElementsByTagName('img');
            
            for(var index = 0; index < stylesheets.length; index++) {

                var match;

                while(match = imagePath.exec(stylesheets[index].textContent)) mapImage(match[1], stylesheets[index].getAttribute('ref'));
            }

            for(index = 0; index < images.length; index++) {

                var src = images[index].getAttribute('src');

                if(src) mapImage(src);
            }

            return imageMap;
        },
        replaceImageURL = function(originalURL, newURL) {
            
            var matcher = new RegExp(originalURL, 'g'),
                stylesheets = document.getElementsByTagName('style'),
                images = document.getElementsByTagName('img');

            for(var index = 0; index < stylesheets.length; index++)
                stylesheets[index].textContent = stylesheets[index].textContent && stylesheets[index].textContent.replace(matcher, newURL);

            for(index = 0; index < images.lenth; index++)
                if(images[index].getAttribute('src') === originalURL)
                    images[index].setAttribute('src', newURL);

        };
        
    
    callback(0, {
        
        inlineJavaScripts: function(callback) {

            var externalScripts = [];

            step(
                function downloadExternalScripts() {

                    var allScripts = document.getElementsByTagName('script'),
                        group = this.group();

                    for(var index = 0; index < allScripts.length; index++) {

                        var src = allScripts[index].getAttribute('src');

                        if(src) {

                            externalScripts.push(allScripts[index]);
                            media.retrieveRemoteResource(resolve(src), 'utf8', group());
                        }
                    }
                },
                function convertScriptsToInline(error, scripts) {

                    if(error)
                        callback(error);
                    else {

                        for(var index = 0; index < scripts.length; index++) {

                            externalScripts[index].removeAttribute('src');
                            externalScripts[index].textContent = scripts[index].toString();
                        }

                        callback();
                    }
                }
            );
        },

        
        inlineStylesheets: function(callback) {

            var externalStylesheets = [];

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
                            media.retrieveRemoteResource(resolve(href), 'utf8', group());
                        }
                    }

                    if(!stylesheetCount) callback();
                },
                function convertStylesheetsToInline(error, stylesheets) {

                    if(error)
                        callback(error);
                    else {

                        for(var index = 0; index < externalStylesheets.length; index++) {

                            var styleNode = document.createElement('style');

                            styleNode.textContent = stylesheets[index].toString();
                            styleNode.setAttribute('type', 'text/css');
                            styleNode.setAttribute('ref', externalStylesheets[index].getAttribute('href'));

                            externalStylesheets[index].parentNode.replaceChild(styleNode, externalStylesheets[index]);
                        }

                        callback();
                    }
                }
            );
        },

        
        inlineImages: function(callback) {

            var imageMap = mapImages();

            step(
                function downloadImages() {

                    var group = this.group();

                    if(imageMap.length) { 
                        delete imageMap.length; 
                        for(var file in imageMap) media.remoteImageToDataURL(file, group());
                    } else callback();
                },
                function processImages(error, dataURLs) {

                    if(error)
                        callback(error);
                    else {

                        dataURLs.forEach(
                            function(image) {

                                var originalURLs = imageMap[image.url];

                                for(var url in originalURLs) {

                                    replaceImageURL(url, image.dataURL);
                                }
                            }
                        );

                        callback();
                    }
                }
            );
        },
        

        rebaseImages: function(imageBase, callback) {

            var imageMap = mapImages(),
                rebaseMap = {},
                stylesheets = document.getElementsByTagName('style'),
                images = document.getElementsByTagName('img'),
                baseIsURL = /^((http[s]?|file)\:)?\/\//i.test(imageBase);

            delete imageMap.length;

            for(var mappedURL in imageMap) {

                rebaseMap[mappedURL] = [];

                for(var originalURL in imageMap[mappedURL]) {

                    var rebasedURL = baseIsURL ? url.resolve(imageBase, originalURL) : path.join(imageBase, originalURL);
                    replaceImageURL(originalURL, rebasedURL); 
                    rebaseMap[mappedURL].push(rebasedURL);
                }
            }

            rebaseMap = document.createComment(JSON.stringify(rebaseMap));
            document.appendChild(rebaseMap);

            process.nextTick(callback);

        },
        
        
        minifyJavaScripts: function(callback) {

            var javaScripts = document.getElementsByTagName('script');

            for(var index = 0; index < javaScripts.length; index++) {


                if(!javaScripts[index].getAttribute('src') && javaScripts[index].textContent) {

                    try {

                        javaScripts[index].textContent = uglify(javaScripts[index].textContent);
                    } catch(e) {

                        javaScripts[index].textContent = '/* MINIFICATION FAILED */\n' + javaScripts[index].textContent;
                    }
                }
            }

            process.nextTick(callback);
        },
        
        
        minifyStylesheets: function(callback) {

            var stylesheets = document.getElementsByTagName('style');

            for(var index = 0; index < stylesheets.length; index++) {

                if(!stylesheets[index].getAttribute('rel') === 'stylesheet') {

                    try {

                        stylesheets[index] = cssmin(stylesheets[index]);
                    } catch(e) {

                        stylesheets[index] = '/* MINIFICATION FAILED */\n' + stylesheets[index];
                    }
                }
            }

            process.nextTick(callback);
        },
        
        renderAsHTML: function(callback) {

            var html = document.doctype + document.innerHTML;

            try { 
                html = kompressor(html);
            } catch(e) {
                html = '<!-- MINIFICATION FAILED -->\n' + html;
            }

            process.nextTick(
                function() {

                    callback(0, html);
                }
            );
        }
    });
};

