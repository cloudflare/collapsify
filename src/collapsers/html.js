import Rewriter from '../utils/parse5-async-rewriter.js';
import flattenImage from '../plugins/parse5-flatten-image.js';
import inlineStyle from '../plugins/parse5-flatten-inline-style.js';
import externalStyle from '../plugins/parse5-flatten-external-style.js';
import flattenScript from '../plugins/parse5-flatten-script.js';

export async function external(options) {
  const response = await options.fetch(options.resourceLocation);
  return collapse(await response.getAsString(), options);
}

async function collapse(text, options) {
  const rewriter = new Rewriter();

  flattenImage(rewriter, options);
  inlineStyle(rewriter, options);
  externalStyle(rewriter, options);
  flattenScript(rewriter, options);

  return rewriter.process(text);
}

export default collapse;
