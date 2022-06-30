import bole from 'bole';
import {HTMLRewriter} from 'html-rewriter-wasm';
import collapseJavaScript from '../collapsers/javascript.js';
import {CollapsifyOptions} from '../collapsify.js';

const logger = bole('collapsify:collapsers:html');

export default function flattenScript(
  rewriter: HTMLRewriter,
  options: CollapsifyOptions,
) {
  rewriter.on('script', {
    async element(element) {
      const type = element.getAttribute('type');

      // Ignore non-JavaScript types.
      // Empty `type` should be treated just like missing one.
      if (
        type &&
        type !== 'text/javascript' &&
        type !== 'application/javascript'
      ) {
        logger.debug('ignoring script of type "%s"', type);
        return;
      }

      const src = element.getAttribute('src');

      // Ignore inline scripts here.
      // Unlike `type`, empty `src` should be treated as actual value.
      if (!src) {
        return;
      }

      const content = await collapseJavaScript.external({
        fetch: options.fetch,
        resourceLocation: new URL(src, options.resourceLocation).toString(),
      });

      // Remove original `src` attribute.
      element.removeAttribute('src');
      element.setInnerContent(content, {html: true});
    },
  });

  // Gets built up, then reset when `text.lastInTextNode` is found.
  let innerContent = '';
  rewriter.on('script', {
    async text(text) {
      innerContent += text.text;
      if (text.lastInTextNode) {
        const content = await collapseJavaScript(innerContent, {
          resourceLocation: '<script>',
        });

        text.replace(content, {html: true});
        innerContent = '';
      } else {
        text.remove();
      }
    },
  });
}
