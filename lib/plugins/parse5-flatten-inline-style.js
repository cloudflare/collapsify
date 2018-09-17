'use strict';
const collapseCSS = require('../collapsers/css');

module.exports = (rewriter, opts) => {
  let inStyle = false;

  rewriter.on('startTag', tag => {
    inStyle = tag.tagName === 'style';
  });

  rewriter.on('endTag', () => {
    inStyle = false;
  });

  rewriter.on('text', async token => {
    if (!inStyle) {
      return;
    }

    const content = await collapseCSS(token.text, {
      imported: false,
      fetch: opts.fetch,
      resourceLocation: opts.resourceLocation
    });

    // NOTE: use emitRaw here to not escape HTML entities in content.
    rewriter.emitRaw(content);

    return true;
  });
};
