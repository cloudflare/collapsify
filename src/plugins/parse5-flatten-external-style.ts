import {StartTagToken} from 'parse5-sax-parser';
import collapseCSS from '../collapsers/css.js';
import Rewriter from '../utils/parse5-async-rewriter.js';

export default function flattenExternalStyle(rewriter: Rewriter, options: any) {
  rewriter.on('startTag', async (tag: StartTagToken) => {
    if (tag.tagName !== 'link') return;

    const rel = tag.attrs.find((attr) => attr.name === 'rel');

    if (!rel || rel.value !== 'stylesheet') {
      return;
    }

    const href = tag.attrs.find((attr) => attr.name === 'href');

    if (!href || !href.value) {
      return;
    }

    rewriter.emitStartTag({
      tagName: 'style',
      attrs: [],
      selfClosing: false,
    });
    // NOTE: use emitRaw here to not escape HTML entities in content.
    rewriter.emitRaw(
      await collapseCSS.external({
        fetch: options.fetch,
        resourceLocation: new URL(
          href.value,
          options.resourceLocation,
        ).toString(),
      }),
    );
    rewriter.emitEndTag({
      tagName: 'style',
    });

    return true;
  });
}
