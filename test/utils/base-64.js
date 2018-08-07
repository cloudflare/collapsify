'use strict';
const path = require('path');
const assert = require('power-assert');
const fs = require('mz/fs');
const {describe, it} = require('mocha');
const base64 = require('../../lib/utils/base-64');

describe('base64 utility', () => {
  describe('encode', () => {
    it('should base64 encode ASCII text', () => {
      return base64.encode(Buffer.from('plain text')).then(encoded => {
        assert(typeof encoded === 'string');
        assert(encoded.match(/^data:text\/plain;charset=us-ascii;base64,/));
      });
    });

    it('should base64 encode Unicode text', () => {
      const buf = Buffer.from([0xf0, 0x9f, 0x9a, 0x97]);

      return base64.encode(buf).then(encoded => {
        assert(typeof encoded === 'string');
        assert(encoded.match(/^data:text\/plain;charset=utf-8;base64,/));
      });
    });

    it('should base64 encode a GIF', () => {
      return fs
        .readFile(path.join(__dirname, '../fixtures/gif.gif'))
        .then(base64.encode)
        .then(encoded => {
          assert(typeof encoded === 'string');
          assert(encoded.match(/^data:image\/gif;charset=binary;base64,/));
        });
    });

    it('should not have spaces in the base64 string', () => {
      return fs
        .readFile(path.join(__dirname, '../fixtures/gif.gif'))
        .then(base64.encode)
        .then(encoded => {
          assert(typeof encoded === 'string');
          assert(!encoded.match(/\s/));
        });
    });
  });

  describe('verifySync', () => {
    it('should verify ASCII text', () => {
      const encoded =
        'data:text/plain;charset=us-ascii;base64,cGxhaW4gdGV4dA==';
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
