'use strict';

function encodeSync(body, {contentType = ''}) {
  contentType = contentType.replace(/\s+/g, '');
  return `data:${contentType};base64,${body.toString('base64')}`;
}

function validateSync(url) {
  return url.startsWith('data:');
}

module.exports = {
  encodeSync,
  validateSync
};
