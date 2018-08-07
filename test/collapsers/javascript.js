'use strict';
const assert = require('power-assert');
const Bluebird = require('bluebird');
const {describe, it} = require('mocha');
const collapser = require('../../lib/collapsers/javascript');

describe('JavaScript collapser', () => {
  it('should minify JavaScript', () => {
    return collapser(Buffer.from('alert("foo: " + bar)')).then(encoded => {
      assert(typeof encoded === 'string');
    });
  });

  it('should reject if invalid JavaScript', () => {
    return collapser(Buffer.from('for: {')).then(
      () => {
        assert.fail('expected rejected promise');
      },
      err => {
        assert(err);
      }
    );
  });

  describe('external', () => {
    it('should collapse an external script', () => {
      return collapser
        .external('https://example.com/script.js', {
          fetch(url) {
            assert(url === 'https://example.com/script.js');
            return Bluebird.resolve('console.log("hello world!");');
          }
        })
        .then(encoded => {
          assert(typeof encoded === 'string');
        });
    });
  });
});
