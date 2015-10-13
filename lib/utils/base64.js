'use strict';
var Rx = require('rx');
var mmmagic = require('mmmagic');
var magic = new mmmagic.Magic(mmmagic.MAGIC_MIME);

var detect = Rx.Observable.fromNodeCallback(magic.detect, magic);

/**
 * Encode data as a base64 encoded data string.
 *
 * The data to be encoded is first identified by libmagic, to reliably
 * determine the filetype and encoding. The base64 encoded data is then
 * merged with this information to form a browser-friendly data URI string.
 *
 * @param {Buffer} data The data to be bas64 encoded.
 * @returns {Rx.Observable} Representing the string data URI.
 */
function encode(data) {
  return detect(data)
    .flatMap(function(mimetype) {
      return Rx.Observable.return([
        'data:',
        mimetype,
        ';base64,',
        data.toString('base64')
      ].join(''));
    });
}

/**
 * Validates if the input string looks like a base64 encoded data URI
 *
 * @param {string} string The string to validate.
 * @returns {boolean}
 */
function validateSync(string) {
  return /^['"]?data:.+;base64,/.test(string);
}

module.exports = {
  encode: encode,
  validateSync: validateSync
};
