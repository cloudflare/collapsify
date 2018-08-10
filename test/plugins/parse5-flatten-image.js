'use strict';
const path = require('path');
const assert = require('power-assert');
const fs = require('mz/fs');
const {describe, it} = require('mocha');
const {CollapserStream} = require('../../lib/collapsers/html');

const plugin = require('../../lib/plugins/parse5-flatten-image');

const fixture = path.join(__dirname, '../fixtures/gif.gif');

async function test(input, expected, opts) {
  const rewriter = new CollapserStream();
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
          return {contentType: 'image/gif', body: await fs.readFile(fixture)};
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
