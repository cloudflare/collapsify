var fs = require('fs'),
    path = require('path'),
    step = require('step'),
    http = require('http'),
    url = require('url');

function imageToDataURL(imageContents, type, callback) {

    if(imageContents) {

        callback(0, 'data:' + (type || 'image/png') + ';base64,' + imageContents.toString('base64'));

    } else
        callback(new Error('No image content provided.'));
}

var retrieveRemoteResource = exports.retrieveRemoteResource = function(target, encoding, callback) {

    if(target) {

        var result = '',
            urlParts = url.parse(target);

        http.get(
            {
                host: urlParts.host,
                port: urlParts.port,
                path: (urlParts.pathname || '') + (urlParts.search || '')
            }, 
            function(response) { 

                response.setEncoding(encoding);
                response.on('data', function(data) { result += data; });
                response.on(
                    'end', 
                    function() { 

                        var resultObject = {
                            data: new Buffer(result, encoding),
                            type: response.headers['Content-Type'],
                            toString: function() { return resultObject.data.toString(encoding); }
                        };

                        callback(0, resultObject);
                    }
                );

            }
        ).on('error', callback);

    } else
        callback(new Error('No remote target was specified.'));
}

exports.localImageToDataURL = function(file, callback) {

    if(file) {

        step(
            function openFile() {

                fs.readFile(path.resolve(file), this); 
            },
            function createImage(error, resource) {

                if(error)
                    callback(error);
                else 
                    imageToDataURL(resource.data, source.type, this);
            },
            function printDataURL(error, url) {

                if(error)
                    callback(error);
                else
                    callback(0, { file: file, dataURL: url });
            }
        );

    } else
        callback(new Error('You must specify an image file as input.'));
};

exports.remoteImageToDataURL = function(url, callback) {

    if(url) {

        step(
            function grabResource() {

                retrieveRemoteResource(url, 'binary',  this);
            },
            function createImage(error, resource) {

                if(error)
                    callback(error);
                else
                    imageToDataURL(resource.data, resource.type, this);
            },
            function printDataURL(error, dataURL) {

                if(error)
                    callback(error);
                else
                    callback(0, { url: url, dataURL: dataURL });
            }
        );
    } else
        callback(new Error('You must specify an image URL as input.'));
}
