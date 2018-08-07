'use strict';
const path = require('path');
const assert = require('power-assert');
const fs = require('mz/fs');
const {describe, it} = require('mocha');
const collapser = require('../../lib/collapsers/binary');

describe('binary collapser', () => {
  it('should collapse a GIF', async () => {
    const encoded = await fs
      .readFile(path.join(__dirname, '../fixtures/gif.gif'))
      .then(collapser);

    assert(typeof encoded === 'string');
    assert(encoded.match(/^data:image\/gif;charset=binary;base64,/));
  });

  describe('external', () => {
    it('should collapse an external binary', async () => {
      const encoded = await collapser.external('https://example.com/gif.gif', {
        fetch(url) {
          assert(url === 'https://example.com/gif.gif');
          return fs.readFile(path.join(__dirname, '../fixtures/gif.gif'));
        }
      });

      assert(typeof encoded === 'string');
      assert(encoded.match(/^data:image\/gif;charset=binary;base64,/));
    });
  });
});
