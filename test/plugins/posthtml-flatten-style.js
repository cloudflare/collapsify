'use strict';
const path = require('path');
const assert = require('power-assert');
const Bluebird = require('bluebird');
const posthtml = require('posthtml');
const fs = require('mz/fs');
const describe = require('mocha').describe;
const it = require('mocha').it;

const plugin = require('../../lib/plugins/posthtml-flatten-style');

function test(input, output, opts) {
  return posthtml([plugin(opts)]).process(input).then(result => {
    assert(result.html === output);
  });
}

describe('posthtml-flatten-style', () => {
  it('should flatten inline style', () => {
    return test('<style>body { background: url(gif.gif); }</style>', '<style>body{background:url(data:image/gif;charset=binary;base64,R0lGODlhAQABAAAAADs=)}</style>', {
      fetch(url) {
        assert(url === 'https://example.com/gif.gif');
        return fs.readFile(path.join(__dirname, '../fixtures/gif.gif'));
      },
      resourceLocation: 'https://example.com'
    });
  });

  it('should ignore base64 URLs in inline style', () => {
    return test('<style>body { background: url(data:application/x-empty;base64,); }</style>', '<style>body{background:url(data:application/x-empty;base64,)}</style>', {
      fetch() {
        assert(false, 'unexpected resource resolution');
      },
      resourceLocation: 'https://example.com'
    });
  });

  it('should flatten external stylesheets', () => {
    return test('<link rel="stylesheet" href="/static/css/app.css">', '<style>body,html{height:100%}</style>', {
      fetch(url) {
        assert(url === 'https://example.com/static/css/app.css');
        return Bluebird.resolve(Buffer.from('html, body { height: 100%; }'));
      },
      resourceLocation: 'https://example.com/page.html'
    });
  });

  it('should flatten resources in external stylesheets', () => {
    return test('<link rel="stylesheet" href="/static/css/app.css">', '<style>body,html{background:url(data:image/gif;charset=binary;base64,R0lGODlhAQABAAAAADs=)}</style>', {
      fetch(url) {
        switch (url) {
          case 'https://example.com/static/css/app.css':
            return Bluebird.resolve(Buffer.from('html, body { background: url(gif.gif) }'));
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
