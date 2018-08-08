'use strict';
const postcss = require('postcss');
const assert = require('power-assert');
const {describe, it} = require('mocha');

const plugin = require('../../lib/plugins/postcss-flatten-import');

async function test(input, output, opts = {}) {
  const result = await postcss([plugin(opts)]).process(input, {
    from: opts.resourceLocation
  });

  assert(result.css === output);
}

describe('postcss-flatten-import', () => {
  it('should flatten imports', () => {
    return test(
      '@import "fonts.css"',
      '@font-face{font-family:Noto Sans;font-style:normal;font-weight:400;src:local("Noto Sans")}',
      {
        async fetch(url) {
          assert(url === 'http://example.com/static/css/fonts.css');
          return {
            body: Buffer.from(
              '@font-face {\n    font-family: Noto Sans;\n    font-style: normal;\n    font-weight: 400;\n    src: local("Noto Sans")\n}'
            )
          };
        },
        resourceLocation: 'http://example.com/static/css/app.css'
      }
    );
  });

  it('should wrap flattend imports with media query', () => {
    return test(
      '@import flatten.css screen, projection',
      '@media screen, projection {.flatten{color:#00f}}',
      {
        async fetch(url) {
          assert(url === 'http://example.com/static/css/flatten.css');
          return {body: Buffer.from('.flatten { color: blue }')};
        },
        resourceLocation: 'http://example.com/static/css/app.css'
      }
    );
  });
});
