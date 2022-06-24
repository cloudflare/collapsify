import postcss from 'postcss';
import assert from 'power-assert';
import {describe, it} from 'mocha';

import plugin from '../../src/plugins/postcss-flatten-import.js';
import {stringResponse} from '../helpers.js';

async function test(input, output, options = {}) {
  const result = await postcss([plugin(options)]).process(input, {
    from: options.resourceLocation,
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
          return stringResponse(
            '@font-face {\n    font-family: Noto Sans;\n    font-style: normal;\n    font-weight: 400;\n    src: local("Noto Sans")\n}',
          );
        },
        resourceLocation: 'http://example.com/static/css/app.css',
      },
    );
  });

  it('should wrap flattend imports with media query', () => {
    return test(
      '@import flatten.css screen, projection',
      '@media screen, projection {.flatten{color:blue}}',
      {
        async fetch(url) {
          assert(url === 'http://example.com/static/css/flatten.css');
          return stringResponse('.flatten { color: blue }');
        },
        resourceLocation: 'http://example.com/static/css/app.css',
      },
    );
  });
});
