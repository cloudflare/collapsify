'use strict';
const {promisify} = require('util');
const mmmagic = require('mmmagic');

const magic = new mmmagic.Magic(mmmagic.MAGIC_MIME);

const detect = promisify(magic.detect.bind(magic));

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
 * Validates if the input string looks like a data URI
 *
 * @param {string} url The string to validate.
 * @returns {boolean} Validation status.
 */
function validateSync(url) {
  return url.startsWith('data:');
}

module.exports = {
  encode,
  validateSync
};
