'use strict';
var path = require('path');
var assert = require('power-assert');
var Bluebird = require('bluebird');
var posthtml = require('posthtml');
var fs = require('mz/fs');
var describe = require('mocha').describe;
var it = require('mocha').it;

var plugin = require('../../lib/plugins/posthtml-flatten-style');

function test(input, output, opts) {
  return posthtml([plugin(opts)]).process(input).then(function (result) {
    assert(result.html === output);
  });
}

describe('posthtml-flatten-style', function () {
  it('should flatten inline style', function () {
    return test('<style>body { background: url(gif.gif); }</style>', '<style>body{background:url(data:image/gif;charset=binary;base64,R0lGODlhAQABAAAAADs=)}</style>', {
      fetch: function (url) {
        assert(url === 'https://example.com/gif.gif');
        return fs.readFile(path.join(__dirname, '../fixtures/gif.gif'));
      },
      resourceLocation: 'https://example.com'
    });
  });

  it('should ignore base64 URLs in inline style', function () {
    return test('<style>body { background: url(data:application/x-empty;base64,); }</style>', '<style>body{background:url(data:application/x-empty;base64,)}</style>', {
      fetch: function () {
        assert(false, 'unexpected resource resolution');
      },
      resourceLocation: 'https://example.com'
    });
  });

  it('should flatten external stylesheets', function () {
    return test('<link rel="stylesheet" href="/static/css/app.css">', '<style>body,html{height:100%}</style>', {
      fetch: function (url) {
        assert(url === 'https://example.com/static/css/app.css');
        return Bluebird.resolve(new Buffer('html, body { height: 100%; }'));
      },
      resourceLocation: 'https://example.com/page.html'
    });
  });

  it('should flatten resources in external stylesheets', function () {
    return test('<link rel="stylesheet" href="/static/css/app.css">', '<style>body,html{background:url(data:image/gif;charset=binary;base64,R0lGODlhAQABAAAAADs=)}</style>', {
      fetch: function (url) {
        switch (url) {
          case 'https://example.com/static/css/app.css':
            return Bluebird.resolve(new Buffer('html, body { background: url(gif.gif) }'));
          case 'https://example.com/static/css/gif.gif':
            return fs.readFile(path.join(__dirname, '../fixtures/gif.gif'));
          default:
            assert(false, 'unknown resource resolution');
            return '';
        }
      },
      resourceLocation: 'https://example.com/page.html'
    });
  });
});
