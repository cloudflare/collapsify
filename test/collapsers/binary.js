'use strict';
const assert = require('power-assert');
const {describe, it} = require('mocha');
const {gifResponse, gifData} = require('../helpers');
const collapser = require('../../lib/collapsers/binary');

describe('binary collapser', () => {
  it('should collapse a GIF', async () => {
    const encoded = await collapser(await gifData(), {
      contentType: 'image/gif',
    });

    assert(typeof encoded === 'string');
    assert(encoded.startsWith('data:image/gif;base64,'));
  });

  describe('external', () => {
    it('should collapse an external binary', async () => {
      const encoded = await collapser.external({
        async fetch(url) {
          assert(url === 'https://example.com/gif.gif');
          return gifResponse();
        },
        resourceLocation: 'https://example.com/gif.gif',
      });

      assert(typeof encoded === 'string');
      assert(encoded.startsWith('data:image/gif;base64,'));
    });
  });
});
