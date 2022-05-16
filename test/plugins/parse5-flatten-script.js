'use strict';
const assert = require('power-assert');
const {describe, it} = require('mocha');
const Rewriter = require('../../lib/utils/parse5-async-rewriter');

const plugin = require('../../lib/plugins/parse5-flatten-script');
const {stringResponse} = require('../helpers');

async function test(input, expected, opts) {
  const rewriter = new Rewriter();
  plugin(rewriter, opts);
  const actual = await rewriter.process(input);
  assert(actual === expected);
}

describe('posthtml-flatten-script', () => {
  it('should flatten inline JavaScript', () => {
    return test(
      '<script>alert("foo" + "bar"); var a = c < b;</script>',
      '<script>alert("foobar");var a=c<b;</script>',
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
      '<script type="application/javascript">\n//<![CDATA[\nalert("foo" + "bar");\n//]]></script>',
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
      '<script>alert("foobar");var a=c<b;</script>',
      {
        async fetch(url) {
          assert(url === 'https://example.com/app.js');
          return stringResponse('alert("foo" + "bar"); var a = c < b;');
        },
        resourceLocation: 'https://example.com/'
      }
    );
  });
});
