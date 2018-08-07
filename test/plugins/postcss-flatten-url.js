'use strict';
const postcss = require('postcss');
const assert = require('power-assert');
const Bluebird = require('bluebird');
const {describe, it} = require('mocha');

const plugin = require('../../lib/plugins/postcss-flatten-url');

function test(input, output, opts) {
  return postcss([plugin(opts)])
    .process(input)
    .then(result => {
      assert(result.css === output);
    });
}

describe('postcss-flatten-url', () => {
  it("should ignore properties that don't contain URLs", () => {
    return test(
      '.flatten { background: #0581C1 }',
      '.flatten { background: #0581C1 }'
    );
  });

  it('should replace the URL in a property', () => {
    return test(
      '.flatten { background: url("example.png") }',
      '.flatten { background: url("data:application/x-empty;charset=binary;base64,") }',
      {
        fetch(url) {
          assert(url === 'http://example.com/example.png');
          return Bluebird.resolve(Buffer.from(''));
        },
        resourceLocation: 'http://example.com/'
      }
    );
  });

  it('should ignore URLs from the data scheme', () => {
    return test(
      '.flatten { background: url("data:application/x-empty;charset=binary;base64,") }',
      '.flatten { background: url("data:application/x-empty;charset=binary;base64,") }',
      {
        fetch() {
          assert.fail('should not have called fetch');
        },
        resourceLocation: 'http://example.com/'
      }
    );
  });
});
