'use strict';
var Bluebird = require('bluebird');
var mmmagic = require('mmmagic');
var magic = new mmmagic.Magic(mmmagic.MAGIC_MIME);

var detect = Bluebird.promisify(magic.detect, magic);

/**
 * Encode data as a base64 encoded data string.
 *
 * The data to be encoded is first identified by libmagic, to reliably
 * determine the filetype and encoding. The base64 encoded data is then
 * merged with this information to form a browser-friendly data URI string.
 *
 * @param {Buffer} data The data to be bas64 encoded.
 * @returns {Promise} Representing the string data URI.
 */
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
