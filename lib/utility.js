var argv = require('optimist').argv,
    util = require('util');

exports.log = function(out) {

    if(argv.verbose) util.log(out);
};
