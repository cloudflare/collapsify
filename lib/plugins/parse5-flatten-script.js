'use strict';
const {resolve} = require('url');
const logger = require('bole')('collapsify:collapsers:html');
const collapseJavaScript = require('../collapsers/javascript');

module.exports = (rewriter, opts) => {
  let inInlineScript = false;

  rewriter.on('startTag', async tag => {
    inInlineScript = false;

    if (tag.tagName !== 'script') {
      return;
    }

    const {attrs} = tag;

    const type = attrs.find(attr => attr.name === 'type');

    // Ignore non-JavaScript types.
    // Empty `type` should be treated just like missing one.
    if (
      type &&
      type.value &&
      type.value !== 'text/javascript' &&
      type.value !== 'application/javascript'
    ) {
      logger.debug('ignoring script of type "%s"', type.value);
      return;
    }

    const srcIndex = attrs.findIndex(attr => attr.name === 'src');

    // Ignore inline scripts here.
    // Unlike `type`, empty `src` should be treated as actual value.
    if (srcIndex === -1) {
      inInlineScript = true;
      return;
    }

    // Unlike `type`, empty `src` should be treated as actual value.
    const content = await collapseJavaScript.external({
      fetch: opts.fetch,
      resourceLocation: resolve(opts.resourceLocation, attrs[srcIndex].value)
    });

    // Remove original `src` attribute.
    attrs.splice(srcIndex, 1);

    // Emit modified start tag and the contents (but not end tag since it's already in the HTML).
    rewriter.emitStartTag(tag);
    rewriter.emitText({text: content});

    return true;
  });

  rewriter.on('text', async token => {
    if (!inInlineScript) {
      return;
    }

    const content = await collapseJavaScript(token.text, {
      resourceLocation: '<script>'
    });

    rewriter.emitText({
      text: content
    });

    return true;
  });

  rewriter.on('endTag', () => {
    inInlineScript = false;
  });
};
