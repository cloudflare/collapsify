import assert from 'power-assert';
import {describe, it} from 'mocha';
import {gifResponse, gifData} from '../helpers.js';
import collapser from '../../built/collapsers/binary.js';

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
