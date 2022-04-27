'use strict';
const assert = require('power-assert');
const {describe, it} = require('mocha');
const {binaryResponse} = require('../helpers');
const collapser = require('../../lib/collapsers/css');

describe('CSS collapser', () => {
  it('should minify CSS', async () => {
    const collapsed = await collapser('html, body { height: 100%; }', {
      fetch() {
        assert(false, 'unexpected resource resolution');
      },
      resourceLocation: 'https://example.com'
    });

    assert(typeof collapsed === 'string');
    assert(collapsed === 'body,html{height:100%}');
  });

  it('should reject if invalid CSS', async () => {
    try {
      await collapser('html, body {', {
        fetch() {
          assert(false, 'unexpected resource resolution');
        },
        resourceLocation: 'https://example.com'
      });

      assert(false, 'unexpect Promise resolution');
    } catch (err) {
      assert(!(err instanceof assert.AssertionError));
      assert(err.reason === 'Unclosed block');
    }
  });

  describe('external', () => {
    it('should collapse an external binary', async () => {
      const collapsed = await collapser(
        'body { background: url("example.png") }',
        {
          async fetch(url) {
            assert(url === 'https://example.com/example.png');
            return binaryResponse(Buffer.from(''), 'image/png');
          },
          resourceLocation: 'https://example.com'
        }
      );

      assert(collapsed.includes('data:image/png'));
    });
  });
});
