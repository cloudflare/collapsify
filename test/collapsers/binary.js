'use strict';
const path = require('path');
const assert = require('power-assert');
const fs = require('mz/fs');
const {describe, it} = require('mocha');
const collapser = require('../../lib/collapsers/binary');

describe('binary collapser', () => {
  it('should collapse a GIF', async () => {
    const body = await fs.readFile(path.join(__dirname, '../fixtures/gif.gif'));

    const encoded = await collapser(body, {
      contentType: 'image/gif'
    });

    assert(typeof encoded === 'string');
    assert(encoded.startsWith('data:image/gif;base64,'));
  });

  describe('external', () => {
    it('should collapse an external binary', async () => {
      const encoded = await collapser.external({
        async fetch(url) {
          assert(url === 'https://example.com/gif.gif');
          return {
            contentType: 'image/gif',
            body: await fs.readFile(path.join(__dirname, '../fixtures/gif.gif'))
          };
        },
        resourceLocation: 'https://example.com/gif.gif'
      });

      assert(typeof encoded === 'string');
      assert(encoded.startsWith('data:image/gif;base64,'));
    });
  });
});
