var step = require('step'),
    url = require('url'),
    path = require('path'),
    utility = require('../utility'),
    imagePath = /url\(['"]?([^\)]*[^(\.css)'"])['"]?\)/gi;


function mapImages(mobilize) {

    var document = mobilize.document,
        imageMap = { length: 0 },
        mapImage = function(imageURL, alternateBase) {
            
            resolvedURL = alternateBase ? url.resolve(utility.resolve(mobilize, alternateBase), imageURL) : utility.resolve(mobilize, imageURL);

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

}

function replaceImageURL(document, originalURL, newURL) {

    var matcher = new RegExp(originalURL, 'g'),
        stylesheets = document.getElementsByTagName('style'),
        images = document.getElementsByTagName('img');

    for(var index = 0; index < stylesheets.length; index++)
        stylesheets[index].textContent = stylesheets[index].textContent && stylesheets[index].textContent.replace(matcher, newURL);

    for(index = 0; index < images.length; index++)
        if(images[index].getAttribute('src') === originalURL)
            images[index].setAttribute('src', newURL);

}

exports.inlineImages = function() {

    return function(mobilize, callback) {

        if(mobilize.imageBase) {

            // TODO: Take out this conditional, and instead just ignore data URIs in rebaseImages
            callback(0, mobilize);
            return;
        }

        var imageMap = mapImages(mobilize),
            document = mobilize.document;

        step(
            function downloadImages() {

                var group = this.group();

                if(imageMap.length) { 
                    delete imageMap.length; 
                    for(var file in imageMap) utility.remoteImageToDataURL(file, group());
                } else callback(0, mobilize);
            },
            function processImages(error, dataURLs) {

                if(error)
                    callback(error, mobilize);
                else {

                    dataURLs.forEach(
                        function(image) {

                            var originalURLs = imageMap[image.url];

                            for(var url in originalURLs) {

                                replaceImageURL(document, url, image.dataURL);
                            }
                        }
                    );

                    callback(0, mobilize);
                }
            }
        );
    };
};

exports.rebaseImages = function(defaultImageBase) {
    
    return function(mobilize, callback) {

        var imageMap = mapImages(mobilize),
            document = mobilize.document,
            rebaseMap = {},
            stylesheets = document.getElementsByTagName('style'),
            images = document.getElementsByTagName('img'),
            imageBase = mobilize.imageBase || defaultImageBase || '',
            baseIsURL = /^((http[s]?|file)\:)?\/\//i.test(imageBase);

        if(!!imageBase) {

            // TODO: Ignore data URIs

            delete imageMap.length;

            for(var mappedURL in imageMap) {

                rebaseMap[mappedURL] = [];

                for(var originalURL in imageMap[mappedURL]) {

                    var rebasedURL = baseIsURL ? url.resolve(imageBase, originalURL) : path.join(imageBase, originalURL);
                    replaceImageURL(document, originalURL, rebasedURL); 
                    rebaseMap[mappedURL].push(rebasedURL);
                }
            }

            rebaseMap = document.createComment(JSON.stringify(rebaseMap));
            document.appendChild(rebaseMap);
        }

        process.nextTick(function() { callback(0, mobilize); });
    };
};


