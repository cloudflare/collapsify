'use strict';
const {resolve} = require('url');
const collapseCSS = require('../collapsers/css');

module.exports = (rewriter, opts) =>
  rewriter.on('startTag', async tag => {
    if (tag.tagName !== 'link') return;

    const rel = tag.attrs.find(attr => attr.name === 'rel');

    if (!rel || rel.value !== 'stylesheet') {
      return;
    }

    const href = tag.attrs.find(attr => attr.name === 'href');

    if (!href || !href.value) {
      return;
    }

    rewriter.emitStartTag({
      tagName: 'style',
      attrs: [],
      selfClosing: false
    });
    // NOTE: use emitRaw here to not escape HTML entities in content.
    rewriter.emitRaw(
      await collapseCSS.external({
        fetch: opts.fetch,
        resourceLocation: resolve(opts.resourceLocation, href.value)
      })
    );
    rewriter.emitEndTag({
      tagName: 'style'
    });

    return true;
  });
