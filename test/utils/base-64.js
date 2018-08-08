'use strict';
const path = require('path');
const assert = require('power-assert');
const fs = require('mz/fs');
const {describe, it} = require('mocha');
const base64 = require('../../lib/utils/base-64');

describe('base64 utility', () => {
  describe('encode', () => {
    it('should base64 encode ASCII text', async () => {
      const encoded = await base64.encode(Buffer.from('plain text'));
      assert(typeof encoded === 'string');
      assert(encoded.startsWith('data:text/plain;charset=us-ascii;base64,'));
    });

    it('should base64 encode Unicode text', async () => {
      const buf = Buffer.from([0xf0, 0x9f, 0x9a, 0x97]);

      const encoded = await base64.encode(buf);
      assert(typeof encoded === 'string');
      assert(encoded.startsWith('data:text/plain;charset=utf-8;base64,'));
    });

    it('should base64 encode a GIF', async () => {
      const encoded = await fs
        .readFile(path.join(__dirname, '../fixtures/gif.gif'))
        .then(base64.encode);

      assert(typeof encoded === 'string');
      assert(encoded.startsWith('data:image/gif;charset=binary;base64,'));
    });

    it('should not have spaces in the base64 string', async () => {
      const encoded = await fs
        .readFile(path.join(__dirname, '../fixtures/gif.gif'))
        .then(base64.encode);

      assert(typeof encoded === 'string');
      assert(!/\s/.test(encoded));
    });
  });

  describe('verifySync', () => {
    it('should verify ASCII text', () => {
      const encoded = 'data:text/plain;charset=us-ascii,plain text';
      assert(base64.validateSync(encoded));
    });

    it('should verify Unicode text', () => {
      const encoded = 'data:text/plain;charset=utf-8;base64,8J+alw==';
      assert(base64.validateSync(encoded));
    });

    it('should verify a GIF', () => {
      const encoded =
        'data:image/gif;charset=binary;base64,R0lGODlhAQABAAAAADs=';
      assert(base64.validateSync(encoded));
    });
  });
});
