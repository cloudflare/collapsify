'use strict';
var postcss = require('postcss');
var assert = require('power-assert');
var Bluebird = require('bluebird');
var describe = require('mocha').describe;
var it = require('mocha').it;

var plugin = require('../../lib/plugins/postcss-flatten-import');

function test(input, output, opts) {
  return postcss([plugin(opts)]).process(input).then(function (result) {
    assert(result.css === output);
  });
}

describe('postcss-flatten-import', function () {
  it('should flatten imports', function () {
    var style = '@font-face {\n    font-family: Noto Sans;\n    font-style: normal;\n    font-weight: 400;\n    src: local("Noto Sans")\n}';

    return test('@import "fonts.css"', style, {
      fetch: function (url) {
        assert(url === 'http://example.com/static/css/fonts.css');
        return Bluebird.resolve(new Buffer(style));
      },
      resourceLocation: 'http://example.com/static/css/app.css'
    });
  });

  it('should wrap flattend imports with media query', function () {
    return test('@import flatten.css screen, projection', '@media screen, projection {\n    .flatten {\n        color: blue\n    }\n}', {
      fetch: function (url) {
        assert(url === 'http://example.com/static/css/flatten.css');
        return Bluebird.resolve(new Buffer('.flatten { color: blue }'));
      },
      resourceLocation: 'http://example.com/static/css/app.css'
    });
  });
});
