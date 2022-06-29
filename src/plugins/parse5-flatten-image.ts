import {StartTagToken} from 'parse5-sax-parser';
import collapseBinary from '../collapsers/binary.js';
import {CollapsifyOptions} from '../collapsify.js';
import {validateSync} from '../utils/data-uri.js';
import Rewriter from '../utils/parse5-async-rewriter.js';

export default function flattenImage(
  rewriter: Rewriter,
  options: CollapsifyOptions,
) {
  rewriter.on('startTag', async (tag: StartTagToken) => {
    if (tag.tagName !== 'img') {
      return;
    }

    const src = tag.attrs.find((attr) => attr.name === 'src');

    if (!src) {
      return;
    }

    const url = src.value;

    if (validateSync(url)) {
      return;
    }

    src.value = await collapseBinary.external({
      fetch: options.fetch,
      resourceLocation: new URL(url, options.resourceLocation).toString(),
    });

    rewriter.emitStartTag(tag);

    return true;
  });
}
