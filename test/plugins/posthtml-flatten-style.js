'use strict';
const path = require('path');
const assert = require('power-assert');
const posthtml = require('posthtml');
const fs = require('mz/fs');
const {describe, it} = require('mocha');

const plugin = require('../../lib/plugins/posthtml-flatten-style');

async function test(input, output, opts) {
  const result = await posthtml([plugin(opts)]).process(input);

  assert(result.html === output);
}

describe('posthtml-flatten-style', () => {
  it('should flatten inline style', () => {
    return test(
      '<style>body { background: url(gif.gif); }</style>',
      '<style>body{background:url(data:image/gif;base64,R0lGODlhAQABAAAAADs=)}</style>',
      {
        async fetch(url) {
          assert(url === 'https://example.com/gif.gif');
          return {
            contentType: 'image/gif',
            body: await fs.readFile(path.join(__dirname, '../fixtures/gif.gif'))
          };
        },
        resourceLocation: 'https://example.com'
      }
    );
  });

  it('should ignore base64 URLs in inline style', () => {
    return test(
      '<style>body { background: url(data:application/x-empty;base64,); }</style>',
      '<style>body{background:url(data:application/x-empty;base64,)}</style>',
      {
        fetch() {
          assert(false, 'unexpected resource resolution');
        },
        resourceLocation: 'https://example.com'
      }
    );
  });

  it('should flatten external stylesheets', () => {
    return test(
      '<link rel="stylesheet" href="/static/css/app.css">',
      '<style>body,html{height:100%}</style>',
      {
        async fetch(url) {
          assert(url === 'https://example.com/static/css/app.css');
          return {body: Buffer.from('html, body { height: 100%; }')};
        },
        resourceLocation: 'https://example.com/page.html'
      }
    );
  });

  it('should flatten resources in external stylesheets', () => {
    return test(
      '<link rel="stylesheet" href="/static/css/app.css">',
      '<style>body,html{background:url(data:image/gif;base64,R0lGODlhAQABAAAAADs=)}</style>',
      {
        async fetch(url) {
          switch (url) {
            case 'https://example.com/static/css/app.css':
              return {
                body: Buffer.from('html, body { background: url(gif.gif) }')
              };

            case 'https://example.com/static/css/gif.gif':
              return {
                contentType: 'image/gif',
                body: await fs.readFile(
                  path.join(__dirname, '../fixtures/gif.gif')
                )
              };

            default:
              assert(false, 'unknown resource resolution');
          }
        },
        resourceLocation: 'https://example.com/page.html'
      }
    );
  });
});
