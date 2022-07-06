import {HTMLRewriter} from 'html-rewriter-wasm';
import collapseCSS from '../collapsers/css.js';
import {CollapsifyOptions} from '../collapsify.js';

export default function flattenInlineStyle(
  rewriter: HTMLRewriter,
  options: CollapsifyOptions,
) {
  let currentText = '';
  rewriter.on('style', {
    async text(text) {
      if (!text.lastInTextNode) {
        currentText += text.text;
        text.remove();
        return;
      }

      const content = await collapseCSS(currentText, {
        imported: false,
        fetch: options.fetch,
        resourceLocation: options.resourceLocation,
      });

      currentText = '';

      if (typeof content !== 'string') {
        throw new TypeError('Wrong output from collapseCSS');
      }

      text.replace(content, {html: true});
    },
  });
}
