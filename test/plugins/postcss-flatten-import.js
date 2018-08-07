'use strict';
const postcss = require('postcss');
const assert = require('power-assert');
const Bluebird = require('bluebird');
const describe = require('mocha').describe;
const it = require('mocha').it;

const plugin = require('../../lib/plugins/postcss-flatten-import');

function test(input, output, opts) {
  return postcss([plugin(opts)])
    .process(input)
    .then(result => {
      assert(result.css === output);
    });
}

describe('postcss-flatten-import', () => {
  it('should flatten imports', () => {
    const style =
      '@font-face {\n    font-family: Noto Sans;\n    font-style: normal;\n    font-weight: 400;\n    src: local("Noto Sans")\n}';

    return test('@import "fonts.css"', style, {
      fetch(url) {
        assert(url === 'http://example.com/static/css/fonts.css');
        return Bluebird.resolve(Buffer.from(style));
      },
      resourceLocation: 'http://example.com/static/css/app.css'
    });
  });

  it('should wrap flattend imports with media query', () => {
    return test(
      '@import flatten.css screen, projection',
      '@media screen, projection {\n    .flatten {\n        color: blue\n    }\n}',
      {
        fetch(url) {
          assert(url === 'http://example.com/static/css/flatten.css');
          return Bluebird.resolve(Buffer.from('.flatten { color: blue }'));
        },
        resourceLocation: 'http://example.com/static/css/app.css'
      }
    );
  });
});
