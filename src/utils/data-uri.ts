import base64 from 'base64-js';

export function encodeSync(arrayData: Uint8Array, {contentType = ''}): string {
  contentType = contentType.replace(/\s+/g, '');
  return `data:${contentType};base64,${base64.fromByteArray(arrayData)}`;
}

export function validateSync(url: string): boolean {
  return url.startsWith('data:');
}
