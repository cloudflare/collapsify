import {type HTMLRewriter} from 'html-rewriter-wasm';
import collapseBinary from '../collapsers/binary.js';
import {type CollapsifyOptions} from '../collapsify.js';
import {validateSync} from '../utils/data-uri.js';

export default function flattenImage(
  rewriter: HTMLRewriter,
  options: CollapsifyOptions,
) {
  rewriter.on('img', {
    async element(element) {
      const src = element.getAttribute('src');

      if (!src || validateSync(src)) {
        return;
      }

      const newValue = await collapseBinary.external({
        fetch: options.fetch,
        resourceLocation: new URL(src, options.resourceLocation).toString(),
      });

      element.setAttribute('src', newValue);
    },
  });
}
