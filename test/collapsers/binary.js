'use strict';
const path = require('path');
const assert = require('power-assert');
const fs = require('mz/fs');
const describe = require('mocha').describe;
const it = require('mocha').it;
const collapser = require('../../lib/collapsers/binary');

describe('binary collapser', () => {
  it('should collapse a GIF', () => {
    return fs
      .readFile(path.join(__dirname, '../fixtures/gif.gif'))
      .then(collapser)
      .then(encoded => {
        assert(typeof encoded === 'string');
        assert(encoded.match(/^data:image\/gif;charset=binary;base64,/));
      });
  });

  describe('external', () => {
    it('should collapse an external binary', () => {
      return collapser
        .external('https://example.com/gif.gif', {
          fetch(url) {
            assert(url === 'https://example.com/gif.gif');
            return fs.readFile(path.join(__dirname, '../fixtures/gif.gif'));
          }
        })
        .then(encoded => {
          assert(typeof encoded === 'string');
          assert(encoded.match(/^data:image\/gif;charset=binary;base64,/));
        });
    });
  });
});
