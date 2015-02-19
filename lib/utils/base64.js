'use strict';
var Bluebird = require('bluebird');
var mmmagic = require('mmmagic');
var magic = new mmmagic.Magic(mmmagic.MAGIC_MIME);

var detect = Bluebird.promisify(magic.detect, magic);

function encode(data) {
  return detect(data).then(function(mimetype) {
    return [
      'data:',
      mimetype,
      ';base64,',
      data.toString('base64')
    ].join('');
  });
}

function validateSync(string) {
  return /^['"]?data:.+;base64,/.test(string);
}

module.exports = {
  encode: encode,
  validateSync: validateSync
};
