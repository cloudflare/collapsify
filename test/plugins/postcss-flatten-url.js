import {Buffer} from 'node:buffer';
import postcss from 'postcss';
import assert from 'power-assert';
import {describe, it} from 'mocha';

import plugin from '../../built/plugins/postcss-flatten-url.js';
import {binaryResponse} from '../helpers.js';

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
