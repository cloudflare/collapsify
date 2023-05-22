import {HTMLRewriter} from 'html-rewriter-wasm';
import {type CollapsifyOptions} from '../collapsify.js';
import flattenExternalStyle from '../plugins/html-flatten-external-style.js';
import flattenImage from '../plugins/html-flatten-image.js';
import flattenInlineStyle from '../plugins/html-flatten-inline-style.js';
import flattenScript from '../plugins/html-flatten-script.js';

export async function rewriteHtml(html: string, options: CollapsifyOptions) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let output = '';
  const rewriter = new HTMLRewriter((chunk) => {
    output += decoder.decode(chunk);
  });

  flattenExternalStyle(rewriter, options);
  flattenInlineStyle(rewriter, options);
  flattenImage(rewriter, options);
  flattenScript(rewriter, options);

  await rewriter.write(encoder.encode(html));
  await rewriter.end();

  return output;
}
