import {rewriteHtml} from '../utils/html-rewriter.js';
import {CollapsifyOptions} from '../collapsify.js';

export async function external(options: CollapsifyOptions) {
  const response = await options.fetch(options.resourceLocation);
  return collapse(await response.getAsString(), options);
}

async function collapse(text: string, options: CollapsifyOptions) {
  return rewriteHtml(text, options);
}

export default collapse;
