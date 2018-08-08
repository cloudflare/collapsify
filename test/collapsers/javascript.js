'use strict';
const assert = require('power-assert');
const {describe, it} = require('mocha');
const collapser = require('../../lib/collapsers/javascript');

describe('JavaScript collapser', () => {
  it('should minify JavaScript', async () => {
    const encoded = await collapser(Buffer.from('alert("foo: " + bar)'));
    assert(typeof encoded === 'string');
  });

  it('should reject if invalid JavaScript', async () => {
    try {
      await collapser(Buffer.from('for: {'));
      assert.fail('expected rejected promise');
    } catch (err) {
      assert(err);
    }
  });

  describe('external', () => {
    it('should collapse an external script', async () => {
      const encoded = await collapser.external({
        async fetch(url) {
          assert(url === 'https://example.com/script.js');
          return {
            body: Buffer.from('console.log("hello world!");')
          };
        },
        resourceLocation: 'https://example.com/script.js'
      });

      assert(typeof encoded === 'string');
    });
  });
});
