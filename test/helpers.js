import {promises as fs} from 'node:fs';
import assert from 'power-assert';

function response({contentType, string, array}) {
  return {
    getContentType() {
      if (contentType) {
        return contentType;
      }

      assert(false, 'unexpected getContentType call');
    },

    async getAsString() {
      if (string) {
        return string;
      }

      assert(false, 'unexpected getAsString call');
    },

    async getAsArray() {
      if (array) {
        return array;
      }

      assert(false, 'unexpected getAsArray call');
    },
  };
}

export function binaryResponse(array, contentType) {
  return response({array, contentType});
}

export function stringResponse(string, contentType) {
  return response({string, contentType});
}

export async function gifData() {
  return fs.readFile(new URL('fixtures/gif.gif', import.meta.url));
}

export async function gifResponse() {
  return response({
    array: gifData(),
    contentType: 'image/gif',
  });
}
