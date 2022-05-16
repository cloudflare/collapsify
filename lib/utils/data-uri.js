'use strict';

const base64 = require('base64-js');

function encodeSync(arrayData, {contentType = ''}) {
  contentType = contentType.replace(/\s+/g, '');
  return `data:${contentType};base64,${base64.fromByteArray(arrayData)}`;
}

function validateSync(url) {
  return url.startsWith('data:');
}

module.exports = {
  encodeSync,
  validateSync
};
