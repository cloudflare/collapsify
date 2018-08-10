'use strict';
const assert = require('power-assert');
const {describe, it} = require('mocha');
const collapser = require('../../lib/collapsers/javascript');

describe('JavaScript collapser', () => {
  it('should minify JavaScript', async () => {
    const encoded = await collapser(Buffer.from('alert("foo: " + bar)'), {
      resourceLocation: '<test>'
    });
    assert(typeof encoded === 'string');
  });

  it('should preserve JavaScript as-is if minification fails', async () => {
    const original = 'for: {';
    const encoded = await collapser(Buffer.from(original), {
      resourceLocation: '<test>'
    });
    assert(encoded === original);
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
