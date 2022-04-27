'use strict';
const assert = require('power-assert');
const {describe, it} = require('mocha');
const {gifData} = require('../helpers');
const {encodeSync, validateSync} = require('../../lib/utils/data-uri');

describe('base64 utility', () => {
  describe('encode', () => {
    it('should base64 encode ASCII text', async () => {
      const encoded = encodeSync(Buffer.from('plain text'), {
        contentType: 'text/plain'
      });
      assert(typeof encoded === 'string');
      assert(encoded.startsWith('data:text/plain;base64,'));
    });

    it('should base64 encode Unicode text', async () => {
      const encoded = encodeSync(Buffer.from([0xf0, 0x9f, 0x9a, 0x97]), {
        contentType: 'text/plain; charset=utf-8'
      });
      assert(typeof encoded === 'string');
      assert(encoded.startsWith('data:text/plain;charset=utf-8;base64,'));
    });

    it('should base64 encode a GIF', async () => {
      const encoded = encodeSync(await gifData(), {
        contentType: 'image/gif'
      });

      assert(typeof encoded === 'string');
      assert(encoded.startsWith('data:image/gif;base64,'));
    });

    it('should not have spaces in the base64 string', async () => {
      const encoded = encodeSync(await gifData(), {
        contentType: 'image/gif'
      });

      assert(typeof encoded === 'string');
      assert(!/\s/.test(encoded));
    });
  });

  describe('verifySync', () => {
    it('should verify ASCII text', () => {
      const encoded = 'data:text/plain;charset=us-ascii,plain text';
      assert(validateSync(encoded));
    });

    it('should verify Unicode text', () => {
      const encoded = 'data:text/plain;charset=utf-8;base64,8J+alw==';
      assert(validateSync(encoded));
    });

    it('should verify a GIF', () => {
      const encoded = 'data:image/gif;base64,R0lGODlhAQABAAAAADs=';
      assert(validateSync(encoded));
    });
  });
});
