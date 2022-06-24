import collapseCSS from '../collapsers/css.js';
import Rewriter from '../utils/parse5-async-rewriter.js';

export default function flattenInlineStyle(rewriter: Rewriter, options: any) {
  let inStyle = false;

  rewriter.on('startTag', (tag) => {
    inStyle = tag.tagName === 'style';
  });

  rewriter.on('endTag', () => {
    inStyle = false;
  });

  rewriter.on('text', async (token) => {
    if (!inStyle) {
      return;
    }

    const content = await collapseCSS(token.text, {
      imported: false,
      fetch: options.fetch,
      resourceLocation: options.resourceLocation,
    });

    // NOTE: use emitRaw here to not escape HTML entities in content.
    rewriter.emitRaw(content);

    return true;
  });
}
