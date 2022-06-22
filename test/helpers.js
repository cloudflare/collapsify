const path = require('path');
const assert = require('power-assert');
const fs = require('mz/fs');

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

function binaryResponse(array, contentType) {
  return response({array, contentType});
}

function stringResponse(string, contentType) {
  return response({string, contentType});
}

async function gifData() {
  return fs.readFile(path.join(__dirname, 'fixtures/gif.gif'));
}

async function gifResponse() {
  return response({
    array: gifData(),
    contentType: 'image/gif',
  });
}

module.exports = {
  binaryResponse,
  gifData,
  gifResponse,
  stringResponse,
};
