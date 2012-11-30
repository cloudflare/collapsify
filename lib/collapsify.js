var htmlparser = require('htmlparser'),
    parserlib = require('parserlib'),
    uglify = require('uglify-js'),
    url = require('url'),
    path = require('path'),
    utility = require('./utility'),
    q = require('q'),
    defer = q.defer,
    ref = q.ref,
    mimeTypes = {
        'png' : 'image/png',
        'jpg' : 'image/jpg',
        'jpeg' : 'image/jpeg',
        'gif' : 'image/gif',
        'tiff' : 'image/tiff',
        'otf' : 'font/opentype',
        'ttf' : 'font/truetype',
        'woff' : 'font/woff',
        'eod' : 'font/eod'
    };

var collapsify = exports.collapsify = function(resourceRoot, options) {

    var remote = utility.isRemote(resourceRoot),
        read = remote ? utility.get : utility.read,
        relative = remote ? function(from, to) {

            if(!utility.isBase64(from) && !utility.isBase64(to))
                return url.resolve(from, to);
            
            return to;
        } : function(from, to) {

            return path.relative(from, to);
        },
        stringifyAttributes = function(attributes) {
            
            var excluded = Array.prototype.slice.call(arguments, 1).reduce(function(excluded, attribute) {
                    
                    return (excluded[attribute] = 1) && excluded;
                }, {}),
                result = '';

            for(var attribute in attributes)
                if(!(attribute in excluded))
                   result += ' ' +  attribute + '="' + attributes[attribute] + '"';

            return result;
        },
        flattenExternalHTML = function(resourceLocation) {

            utility.log('Getting HTML from ' + resourceLocation);

            return read(resourceLocation).then(flattenHTML);
        },
        flattenHTML = function(rawHTML) {

            rawHTML = rawHTML.toString();

            var result = defer(),
                compilationQueue = ref(''),
                handler = new htmlparser.DefaultHandler(function(error, dom) {
                    
                    if(error)
                        result.reject(error);
                    else
                        (function(elements) {

                            var append = arguments.callee;

                            utility.log('Appending ' + elements.length + ' elements: ' + elements.map(function(element) { return element.name || element.type; }).join(', '));

                            elements.forEach(function(element) {

                                utility.log('Handling ' + (element.name || element.type))

                                var elementQueue = ref(''),
                                    elementText = '';

                                switch(element.type) {

                                    case 'script':

                                        elementText = '<script';

                                        if('attribs' in element) {

                                            if('src' in element.attribs)
                                                elementQueue = flattenExternalJavaScript(relative(resourceRoot, element.attribs.src));

                                            elementText += stringifyAttributes(element.attribs, 'src');
                                        }

                                        if(!(('attribs' in element) && element.attribs.src) && 'children' in element && element.children[0].type == 'text') {

                                            utility.log('Handling inline script text!');

                                            elementQueue = flattenJavaScript(element.children[0].data);
                                        }

                                        elementText += '>\n//<![CDATA[\n';

                                        elementQueue = elementQueue.then(function(internalText) {

                                            return elementText + internalText + '\n//]]>\n</script>';
                                        });

                                        compilationQueue = compilationQueue.then(function(html) {

                                            return elementQueue.then(function(elementText) {

                                                return html + elementText;
                                            });
                                        });
                                        
                                        break;
                                    case 'comment':

                                        compilationQueue = compilationQueue.then(function(html) {

                                            return html + '<!--' + element.data + '-->';
                                        });

                                        break;
                                    case 'text':

                                        compilationQueue = compilationQueue.then(function(html) {

                                            return html + element.data;
                                        });

                                        break;
                                    case 'directive':

                                        compilationQueue = compilationQueue.then(function(html) {

                                            return html + '<' + element.data + '>';
                                        });

                                        break;
                                    case 'style':

                                        if('children' in element && element.children[0].type == 'text')
                                            elementQueue = flattenStylesheet(element.children[0].data);

                                        compilationQueue = compilationQueue.then(function(html) {

                                            return elementQueue.then(function(internalText) {

                                                return html + '<' + element.data + '>' + internalText + '</style>';
                                            });
                                        });

                                        break;
                                    case 'tag':
                                    
                                        switch(element.name) {

                                            case 'img':

                                                elementText = '<img';

                                                if('attribs' in element) {

                                                    if(element.attribs.src)
                                                        elementQueue = flattenExternalBinary(relative(resourceRoot, element.attribs.src));

                                                    elementText += stringifyAttributes(element.attribs, 'src');
                                                }

                                                compilationQueue = compilationQueue.then(function(html) {

                                                    return elementQueue.then(function(dataURI) {

                                                        return html + elementText + ' src="' + dataURI + '">';
                                                    });
                                                });

                                                break;
                                            case 'link':

                                                if('attribs' in element && element.attribs.rel == 'stylesheet' && element.attribs.href) {

                                                    elementText = '<style type="text/css">';

                                                    elementQueue = flattenExternalStylesheet(relative(resourceRoot, element.attribs.href));
                                                    
                                                    compilationQueue = compilationQueue.then(function(html) {

                                                        return elementQueue.then(function(internalText) {

                                                            return html + elementText + internalText + '</style>';
                                                        });
                                                    });

                                                    break;
                                                }

                                            case 'area':
                                            case 'base':
                                            case 'br':
                                            case 'col':
                                            case 'hr':
                                            case 'param':
                                            case 'meta':
                                            case 'input':
                                            case 'command':
                                            case 'keygen':
                                            case 'source':

                                                elementText = '<' + element.name;

                                                if('attribs' in element)
                                                    elementText += stringifyAttributes(element.attribs);

                                                compilationQueue = compilationQueue.then(function(html) {

                                                    return html + elementText + ' />';
                                                });
                                                
                                                break;
                                            default:

                                                elementText = '<' + element.name;

                                                if('attribs' in element)
                                                    elementText += stringifyAttributes(element.attribs);

                                                compilationQueue = compilationQueue.then(function(html) {
                                                    
                                                    return html + elementText + '>';
                                                });

                                                if('children' in element)
                                                    append(element.children);

                                                compilationQueue = compilationQueue.then(function(html) {

                                                    return html + '</' + element.name + '>';
                                                });

                                                break;
                                        }
                                        break;
                                    default:
                                        break;
                                }
                            });
                        })(dom);

                    result.resolve(compilationQueue);
                }),
                parser = new htmlparser.Parser(handler);

            parser.parseComplete(rawHTML);

            return result.promise;

        },
        flattenExternalJavaScript = function(resourceLocation) {

            utility.log('Fetching JavaScript from ' + resourceLocation);

            return read(resourceLocation).then(flattenJavaScript);
        },
        flattenJavaScript = function(rawJavaScript) {

            try {
                return ref(uglify(rawJavaScript.toString()));
            } catch(e) {

                utility.log('Failed to minify some JavaScript. ' + e.message);

                return ref('');
            }
        },
        flattenExternalBinary = function(resourceLocation) {

            utility.log('Fetching binary from ' + resourceLocation);

            if(utility.isBase64(resourceLocation))
                return ref(resourceLocation);
            
            return read(resourceLocation).then(function(rawBinary) {

                var match = resourceLocation.match(/\.([^\.]*)$/) || [0, 'png'],
                    extension = match[1];

                return utility.dataToURL(rawBinary, mimeTypes[extension]);
            });
        },
        flattenExternalStylesheet = function(resourceLocation, imported) {

            utility.log('Fetching Stylesheet from ' + (resourceLocation || 'inline node.'));

            return read(resourceLocation).then(function(rawCSS) {

                return flattenStylesheet(rawCSS, resourceLocation, imported);
            });
        },
        flattenStylesheet = function(rawCSS, resourceLocation, imported) {

            utility.log('Flattening raw CSS from ' + (resourceLocation || 'inline style'));

            var result = defer(),
                parser = new parserlib.css.Parser({
                    starHack: true,
                    underscoreHack: true,
                    ieFilters: true
                }),
                compilationQueue = ref(''),
                parts = url.parse(resourceLocation || resourceRoot);

            parser.addListener('startsylesheet', function() {

                if(!imported)
                    compilationQueue = compilationQueue.then(function() {
                        
                        return '/* Stylesheet flattened by Collapsify */\n';
                    });
            });

            parser.addListener('charset', function(event) {

                if(!imported)
                    compilationQueue = compilationQueue.then(function(stylesheet) {

                        return stylesheet + '@charset ' + event.charset + ';';
                    });
            });

            parser.addListener('namespace', function(event) {
                
                compilationQueue = compilationQueue.then(function(stylesheet) {

                    return stylesheet + '@namespace ' + (event.prefix ? event.prefix + ' ' : '') + '"' + event.uri + '";';
                });
            });

            parser.addListener('import', function(event) {

                var importedStylesheetFlattens = flattenExternalStylesheet(relative(resourceLocation, event.uri), true);

                compilationQueue = compilationQueue.then(function(stylesheet) {

                    return importedStylesheetFlattens.then(function(flattenedImportedStylesheet) {

                        return stylesheet + '\n' + flattenedImportedStylesheet;
                    });
                });
            });

            parser.addListener('startpage', function(event) {

                compilationQueue = compilationQueue.then(function(stylesheet) {

                    return stylesheet + '@page ' + (event.pseudo ? ':' + event.pseudo : '') + '{';
                });
            });

            parser.addListener('endpage', function(event) {

                compilationQueue = compilationQueue.then(function(stylesheet) {

                    return stylesheet + '}';
                });
            });

            parser.addListener('startfontface', function(event) {

                compilationQueue = compilationQueue.then(function(stylesheet) {

                    return stylesheet + '@font-face {';
                });
            });

            parser.addListener('endfontface', function(event) {

                compilationQueue = compilationQueue.then(function(stylesheet) {

                    return stylesheet + '}';
                });
            });

            parser.addListener('startmedia', function(event) {

                compilationQueue = compilationQueue.then(function(stylesheet) { 

                    return stylesheet + ' @media ' + event.media.map(function(media) {

                        return media.mediaType + media.features.reduce(function(features, feature) {
                            return features + ' and ' + feature.text;
                        }, '');
                    }).join(',') + '{';
                });
            });

            parser.addListener('endmedia', function(event) {

                compilationQueue = compilationQueue.then(function(stylesheet) {

                    return stylesheet + '}';
                });
            });

            parser.addListener('startrule', function(event) {

                compilationQueue = compilationQueue.then(function(stylesheet) {

                    return stylesheet + event.selectors.map(function(selector) {

                        return selector.text.replace('   ', ' ');
                    }).join(',') + '{';
                });
            });

            parser.addListener('endrule', function(event) {

                compilationQueue = compilationQueue.then(function(stylesheet) {

                    return stylesheet + '}';
                });
            });

            parser.addListener('property', function(event) {

                var propertyName = event.property.text,
                    propertyValue = event.value.text,
                    important = event.important,
                    hack = event.property.hack,
                    urlMatcher = /url\(['"]?([^'^"]*)['"]?\)/i,
                    additionalResource = (propertyValue.match(urlMatcher) || [])[1],
                    binaryFlattens;

                if(additionalResource)
                    binaryFlattens = flattenExternalBinary(relative(resourceLocation || resourceRoot, additionalResource));

                compilationQueue = compilationQueue.then(function(stylesheet) {

                    if(additionalResource)
                        return binaryFlattens.then(function(dataURI) {

                            return stylesheet + propertyName + ':' + (hack ? hack : '')  + propertyValue.replace(urlMatcher, 'url(' + dataURI + ')') + (important ? ' !important' : '') + ';';
                        });

                    return stylesheet + propertyName + ':' + (hack ? hack : '') + propertyValue + (important ? ' !important' : '') + ';';
                });
            });

            parser.addListener('endstylesheet', function() {

                result.resolve(compilationQueue);
            });

            parser.addListener('error', function(error) {

                utility.log('Error while parsing CSS in ' + (resourceLocation || resourceRoot) + ': ' + error.message);
            });

            try {

                parser.parse(rawCSS);

            } catch(e) {

                utility.log('Failed to parse CSS. ' + e.message);
                result.resolve('');

            }

            return result.promise;
        };

    if(options['H'])
        utility.headers = options['H'];


    return flattenExternalHTML(resourceRoot).then(function(flattened) {
        
        utility.log('Final collapsed page is ' + flattened.length + ' bytes.');
        return flattened;
    });
};

