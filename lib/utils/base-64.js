'use strict';
const Bluebird = require('bluebird');
const mmmagic = require('mmmagic');

const magic = new mmmagic.Magic(mmmagic.MAGIC_MIME);

const detect = Bluebird.promisify(magic.detect, {
  context: magic
});

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
async function encode(data) {
  const mimetype = await detect(data);
  return [
    'data:',
    mimetype.replace(/\s+/g, ''),
    ';base64,',
    data.toString('base64')
  ].join('');
}

/**
 * Validates if the input string looks like a base64 encoded data URI
 *
 * @param {string} string The string to validate.
 * @returns {boolean} Validation status.
 */
function validateSync(string) {
  return /^['"]?data:.+;base64,/.test(string);
}

module.exports = {
  encode,
  validateSync
};
