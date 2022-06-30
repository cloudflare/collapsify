import {HTMLRewriter} from 'html-rewriter-wasm';
import collapseCSS from '../collapsers/css.js';
import {CollapsifyOptions} from '../collapsify.js';

export default function flattenInlineStyle(
  rewriter: HTMLRewriter,
  options: CollapsifyOptions,
) {
  rewriter.on('style', {
    async text(text) {
      const content = await collapseCSS(text.text, {
        imported: false,
        fetch: options.fetch,
        resourceLocation: options.resourceLocation,
      });

      if (typeof content !== 'string') {
        throw new TypeError('Wrong output from collapseCSS');
      }

      text.replace(content, {html: true});
    },
  });
}
