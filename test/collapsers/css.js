'use strict';
const assert = require('power-assert');
const Bluebird = require('bluebird');
const describe = require('mocha').describe;
const it = require('mocha').it;
const collapser = require('../../lib/collapsers/css');

describe('CSS collapser', () => {
  it('should minify CSS', () => {
    return collapser(Buffer.from('html, body { height: 100%; }'), {
      fetch() {
        assert(false, 'unexpected resource resolution');
      },
      resourceLocation: 'https://example.com'
    }).then(collapsed => {
      assert(typeof collapsed === 'string');
      assert(collapsed === 'body,html{height:100%}');
    });
  });

  it('should reject if invalid CSS', () => {
    return collapser(Buffer.from('html, body {'), {
      fetch() {
        assert(false, 'unexpected resource resolution');
      },
      resourceLocation: 'https://example.com'
    }).then(() => {
      assert(false, 'unexpect Promise resolution');
    }, err => {
      assert(!(err instanceof assert.AssertionError));
      assert(err.reason === 'Unclosed block');
    });
  });

  describe('external', () => {
    it('should collapse an external binary', () => {
      return collapser(Buffer.from('body { background: url("example.png") }'), {
        fetch(url) {
          assert(url === 'https://example.com/example.png');
          return Bluebird.resolve(Buffer.from(''));
        },
        resourceLocation: 'https://example.com'
      }).then(collapsed => {
        assert(collapsed.match(/data:application\/x-empty/));
      });
    });
  });
});
