'use strict';
const Buffer = require('buffer').Buffer;
const postcss = require('postcss');
const assert = require('power-assert');
const {describe, it} = require('mocha');

const plugin = require('../../lib/plugins/postcss-flatten-url');
const {binaryResponse} = require('../helpers');

async function test(input, output, options = {}) {
  const result = await postcss([plugin(options)]).process(input, {
    from: options.resourceLocation,
  });

  assert(result.css === output);
}

describe('postcss-flatten-url', () => {
  it("should ignore properties that don't contain URLs", () => {
    return test(
      '.flatten { background: #0581C1 }',
      '.flatten { background: #0581C1 }',
    );
  });

  it('should replace the URL in a property', () => {
    return test(
      '.flatten { background: url("example.png") }',
      '.flatten { background: url(data:image/png;base64,) }',
      {
        async fetch(url) {
          assert(url === 'http://example.com/example.png');
          return binaryResponse(Buffer.from(''), 'image/png');
        },
        resourceLocation: 'http://example.com/',
      },
    );
  });

  it('should ignore URLs from the data scheme', () => {
    return test(
      '.flatten { background: url("data:application/x-empty;base64,") }',
      '.flatten { background: url("data:application/x-empty;base64,") }',
      {
        fetch() {
          assert.fail('should not have called fetch');
        },
        resourceLocation: 'http://example.com/',
      },
    );
  });
});
