import {HTMLRewriter} from 'html-rewriter-wasm';
import collapseCSS from '../collapsers/css.js';
import {CollapsifyOptions} from '../collapsify.js';

export default function flattenExternalStyle(
  rewriter: HTMLRewriter,
  options: CollapsifyOptions,
) {
  rewriter.on('link', {
    async element(element) {
      const rel = element.getAttribute('rel');

      if (!rel || rel !== 'stylesheet') {
        return;
      }

      const href = element.getAttribute('href');

      if (!href) {
        return;
      }

      const content = await collapseCSS.external({
        fetch: options.fetch,
        resourceLocation: new URL(href, options.resourceLocation).toString(),
      });

      if (typeof content !== 'string') {
        throw new TypeError('Wrong output from collapseCSS');
      }

      element.replace(`<style>${content}</style>`, {html: true});
    },
  });
}
