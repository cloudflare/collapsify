'use strict';
const assert = require('power-assert');
const posthtml = require('posthtml');
const {describe, it} = require('mocha');

const plugin = require('../../lib/plugins/posthtml-flatten-script');

async function test(input, output, opts) {
  const result = await posthtml([plugin(opts)]).process(input);

  assert(result.html === output);
}

describe('posthtml-flatten-script', () => {
  it('should flatten inline JavaScript', () => {
    return test(
      '<script>alert("foo" + "bar");</script>',
      '<script>alert("foobar");</script>',
      {
        fetch() {
          assert(false, 'unexpected resource resolution');
        }
      }
    );
  });

  it('should ignore scripts with types other than JavaScript', () => {
    const handlebars =
      '<script type="text/x-handlebars-template"><div><h1>{{title}}</h1></div></script>';
    return test(handlebars, handlebars, {
      fetch() {
        assert(false, 'unexpected resource resolution');
      }
    });
  });

  it('should flatten inline JavaScript wraped in CDATA', () => {
    return test(
      '<script type="application/javascript">\n//<![CDATA[\nalert("foo" + "bar");\n//]]>',
      '<script type="application/javascript">alert("foobar");</script>',
      {
        fetch() {
          assert(false, 'unexpected resource resolution');
        }
      }
    );
  });

  it('should flatten external JavaScript', () => {
    return test(
      '<script src="app.js"></script>',
      '<script>alert("foobar");</script>',
      {
        async fetch(url) {
          assert(url === 'https://example.com/app.js');
          return {body: Buffer.from('alert("foo" + "bar");')};
        },
        resourceLocation: 'https://example.com/'
      }
    );
  });
});
