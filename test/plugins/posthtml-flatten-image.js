'use strict';
const path = require('path');
const assert = require('power-assert');
const posthtml = require('posthtml');
const fs = require('mz/fs');
const {describe, it} = require('mocha');
const plugin = require('../../lib/plugins/posthtml-flatten-image');

const fixture = path.join(__dirname, '../fixtures/gif.gif');

async function test(input, output, opts) {
  const result = await posthtml([plugin(opts)]).process(input);

  assert(result.html === output);
}

describe('posthtml-flatten-image', () => {
  it('should flatten found image', () => {
    return test(
      '<html><body><div class="main"><img src="gif.gif" alt="An animated graphic!" /></div></body></html>',
      '<html><body><div class="main"><img src="data:image/gif;charset=binary;base64,R0lGODlhAQABAAAAADs=" alt="An animated graphic!"></div></body></html>',
      {
        fetch(url) {
          assert(url === 'https://example.com/gif.gif');
          return fs.readFile(fixture);
        },
        resourceLocation: 'https://example.com/page.html'
      }
    );
  });

  it('should ignore inlined images', () => {
    return test(
      '<html><body><div class="main"><img src="data:application/x-empty;base64," alt="An animated graphic!" /></div></body></html>',
      '<html><body><div class="main"><img src="data:application/x-empty;base64," alt="An animated graphic!"></div></body></html>',
      {
        fetch() {
          assert(false, 'unexpected resource resolution');
        },
        resourceLocation: 'https://example.com/page.html'
      }
    );
  });
});
