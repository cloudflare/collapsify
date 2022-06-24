import bole from 'bole';
import collapseJavaScript from '../collapsers/javascript.js';

const logger = bole('collapsify:collapsers:html');

export default function flattenScript(rewriter, options) {
  let inInlineScript = false;

  rewriter.on('startTag', async (tag) => {
    inInlineScript = false;

    if (tag.tagName !== 'script') {
      return;
    }

    const {attrs} = tag;

    const type = attrs.find((attr) => attr.name === 'type');

    // Ignore non-JavaScript types.
    // Empty `type` should be treated just like missing one.
    if (
      type?.value !== 'text/javascript' &&
      type?.value !== 'application/javascript'
    ) {
      logger.debug('ignoring script of type "%s"', type.value);
      return;
    }

    const srcIndex = attrs.findIndex((attr) => attr.name === 'src');

    // Ignore inline scripts here.
    // Unlike `type`, empty `src` should be treated as actual value.
    if (srcIndex === -1) {
      inInlineScript = true;
      return;
    }

    // Unlike `type`, empty `src` should be treated as actual value.
    const content = await collapseJavaScript.external({
      fetch: options.fetch,
      resourceLocation: new URL(
        attrs[srcIndex].value,
        options.resourceLocation,
      ).toString(),
    });

    // Remove original `src` attribute.
    attrs.splice(srcIndex, 1);

    // Emit modified start tag and the contents (but not end tag since it's already in the HTML).
    rewriter.emitStartTag(tag);

    // NOTE: use emitRaw here to not escape HTML entities in content.
    rewriter.emitRaw(content);

    return true;
  });

  rewriter.on('text', async (token) => {
    if (!inInlineScript) {
      return;
    }

    const content = await collapseJavaScript(token.text, {
      resourceLocation: '<script>',
    });

    // NOTE: use emitRaw here to not escape HTML entities in content.
    rewriter.emitRaw(content);

    return true;
  });

  rewriter.on('endTag', () => {
    inInlineScript = false;
  });
}
