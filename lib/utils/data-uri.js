import base64 from 'base64-js';

export function encodeSync(arrayData, {contentType = ''}) {
  contentType = contentType.replace(/\s+/g, '');
  return `data:${contentType};base64,${base64.fromByteArray(arrayData)}`;
}

export function validateSync(url) {
  return url.startsWith('data:');
}
