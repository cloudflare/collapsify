import {Buffer} from 'node:buffer';
import assert from 'power-assert';
import {describe, it} from 'mocha';
import {binaryResponse} from '../helpers.js';
import collapser from '../../built/collapsers/css.js';
import {CollapsifyError} from '../../built/collapsify.js';

describe('CSS collapser', () => {
  it('should minify CSS', async () => {
    const collapsed = await collapser('html, body { height: 100%; }', {
      fetch() {
        assert(false, 'unexpected resource resolution');
      },
      resourceLocation: 'https://example.com',
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
        resourceLocation: 'https://example.com',
      });

      assert(false, 'unexpect Promise resolution');
    } catch (error) {
      assert(error instanceof CollapsifyError, 'wrong error type');
      assert.equal(error.message, 'Error during CSS inlining.');
    }
  });

  it('fetch error message returned', async () => {
    try {
      await collapser(`html, body { background: url('something.jpg'); }`, {
        fetch() {
          throw new CollapsifyError('Error from fetch');
        },
        resourceLocation: 'https://example.com',
      });

      assert(false, 'unexpect Promise resolution');
    } catch (error) {
      assert(error instanceof CollapsifyError, 'wrong error type');
      assert.equal(error.message, 'Error from fetch');
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
          resourceLocation: 'https://example.com',
        },
      );

      assert(collapsed.includes('data:image/png'));
    });
  });
});
