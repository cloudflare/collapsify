'use strict';
const assert = require('power-assert');
const {describe, it} = require('mocha');
const {gifResponse} = require('../helpers');
const Rewriter = require('../../lib/utils/parse5-async-rewriter');

const plugin = require('../../lib/plugins/parse5-flatten-image');

async function test(input, expected, opts) {
  const rewriter = new Rewriter();
  plugin(rewriter, opts);
  const actual = await rewriter.process(input);
  assert(actual === expected);
}

describe('posthtml-flatten-image', () => {
  it('should flatten found image', () => {
    return test(
      '<html><body><div class="main"><img src="gif.gif" alt="An animated graphic!" /></div></body></html>',
      '<html><body><div class="main"><img src="data:image/gif;base64,R0lGODlhAQABAAAAADs=" alt="An animated graphic!"/></div></body></html>',
      {
        async fetch(url) {
          assert(url === 'https://example.com/gif.gif');
          return gifResponse();
        },
        resourceLocation: 'https://example.com/page.html'
      }
    );
  });

  it('should ignore inlined images', () => {
    return test(
      '<html><body><div class="main"><img src="data:application/x-empty;base64," alt="An animated graphic!" /></div></body></html>',
      '<html><body><div class="main"><img src="data:application/x-empty;base64," alt="An animated graphic!" /></div></body></html>',
      {
        fetch() {
          assert(false, 'unexpected resource resolution');
        },
        resourceLocation: 'https://example.com/page.html'
      }
    );
  });
});
