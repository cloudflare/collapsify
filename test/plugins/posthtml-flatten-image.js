'use strict';
var path = require('path');
var assert = require('power-assert');
var posthtml = require('posthtml');
var fs = require('mz/fs');
var describe = require('mocha').describe;
var it = require('mocha').it;
var plugin = require('../../lib/plugins/posthtml-flatten-image');

var fixture = path.join(__dirname, '../fixtures/gif.gif');

function test(input, output, opts) {
  return posthtml([plugin(opts)]).process(input).then(function (result) {
    assert(result.html === output);
  });
}

describe('posthtml-flatten-image', function () {
  it('should flatten found image', function () {
    return test('<html><body><div class="main"><img src="gif.gif" alt="An animated graphic!" /></div></body></html>', '<html><body><div class="main"><img src="data:image/gif;charset=binary;base64,R0lGODlhAQABAAAAADs=" alt="An animated graphic!"></div></body></html>', {
      fetch: function (url) {
        assert(url === 'https://example.com/gif.gif');
        return fs.readFile(fixture);
      },
      resourceLocation: 'https://example.com/page.html'
    });
  });

  it('should ignore inlined images', function () {
    return test('<html><body><div class="main"><img src="data:application/x-empty;base64," alt="An animated graphic!" /></div></body></html>', '<html><body><div class="main"><img src="data:application/x-empty;base64," alt="An animated graphic!"></div></body></html>', {
      fetch: function () {
        assert(false, 'unexpected resource resolution');
      },
      resourceLocation: 'https://example.com/page.html'
    });
  });
});
