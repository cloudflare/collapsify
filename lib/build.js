var step = require('step'),
    jsdom = require('jsdom'),
    mutate = require('./mutate'),
    utility = require('./utility');

module.exports = function(target, imageBase, callback) {

    step(
        function initializeDOM() {

            utility.log('Initializing the DOM..');
            jsdom.env(target, this);
        },
        function intializeMutator(error, window) {

            if(error)
                callback(error);
            else {

                utility.log('Configuring the mutator..');
                mutate.createMutator(target, window.document, this);
            }
        },
        function applyMutations(error, mutator) {

            if(error)
                callback(error);
            else {

                step(
                    function() {

                        utility.log('Inlining JavaScripts..');
                        mutator.inlineJavaScripts(this);
                    },
                    function(error) {

                        if(error)
                            callback(error);
                        else {

                            utility.log('Inlining stylesheets..');
                            mutator.inlineStylesheets(this);
                        }
                    },
                    function(error) {

                        if(error)
                            callback(error);
                        else if(!imageBase) {

                            utility.log('Inlining images..');
                            mutator.inlineImages(this);
                        } else
                            this();
                    },
                    function(error) {

                        if(error)
                            callback(error);
                        else if(imageBase) {
                            
                            utility.log('Rebasing images..');
                            mutator.rebaseImages(imageBase, this);
                        } else
                            this();
                    },
                    function(error) {

                        if(error)
                            callback(error);
                        else {

                            utility.log('Minifying JavaScripts..');
                            mutator.minifyJavaScripts(this);
                        }
                    },
                    function(error) {

                        if(error)
                            callback(error);
                        else {

                            utility.log('Minifying stylesheets..');
                            mutator.minifyStylesheets(this);
                        }
                    },
                    function(error) {

                        if(error)
                            callback(error)
                        else {

                            utility.log('Rendering HTML..');
                            mutator.renderAsHTML(this);
                        }
                    },
                    function(error, html) {

                        if(error)
                            callback(error);
                        else
                            callback(0, html);
                    }
                );
            }
        }
    );
};

