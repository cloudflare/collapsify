'use strict';
const assert = require('power-assert');
const {describe, it} = require('mocha');
const Rewriter = require('../../lib/utils/parse5-async-rewriter');

const inlinePlugin = require('../../lib/plugins/parse5-flatten-inline-style');
const externalPlugin = require('../../lib/plugins/parse5-flatten-external-style');
const {stringResponse, gifResponse} = require('../helpers');

async function test(input, expected, options) {
  const rewriter = new Rewriter();
  inlinePlugin(rewriter, options);
  externalPlugin(rewriter, options);
  const actual = await rewriter.process(input);
  assert(actual === expected);
}

describe('posthtml-flatten-style', () => {
  it('should flatten inline style', () => {
    return test(
      '<style>body > .test { background: url(gif.gif); }</style>',
      '<style>body>.test{background:url(data:image/gif;base64,R0lGODlhAQABAAAAADs=)}</style>',
      {
        async fetch(url) {
          assert(url === 'https://example.com/gif.gif');
          return gifResponse();
        },
        resourceLocation: 'https://example.com',
      },
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
        resourceLocation: 'https://example.com',
      },
    );
  });

  it('should flatten external stylesheets', () => {
    return test(
      '<link rel="stylesheet" href="/static/css/app.css">',
      '<style>body,html{height:100%}</style>',
      {
        async fetch(url) {
          assert(url === 'https://example.com/static/css/app.css');
          return stringResponse('html, body { height: 100%; }');
        },
        resourceLocation: 'https://example.com/page.html',
      },
    );
  });

  it('should flatten resources in external stylesheets', () => {
    return test(
      '<link rel="stylesheet" href="/static/css/app.css">',
      '<style>body>.test{background:url(data:image/gif;base64,R0lGODlhAQABAAAAADs=)}</style>',
      {
        async fetch(url) {
          switch (url) {
            case 'https://example.com/static/css/app.css':
              return stringResponse(
                'body > .test { background: url(gif.gif) }',
              );

            case 'https://example.com/static/css/gif.gif':
              return gifResponse();

            default:
              assert(false, 'unknown resource resolution');
          }
        },
        resourceLocation: 'https://example.com/page.html',
      },
    );
  });
});
