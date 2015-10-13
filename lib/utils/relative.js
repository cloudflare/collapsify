'use strict';
var base64Utils = require('./base64');
var url = require('url');

module.exports = function(from, to) {

  if (!base64Utils.validateSync(from) && !base64Utils.validateSync(to)) {
    return url.resolve(from, to);
  }

  return to;
};
