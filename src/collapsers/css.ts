import postcss, {Result} from 'postcss';
import cssnano from 'cssnano';
import bole from 'bole';
import flattenUrl from '../plugins/postcss-flatten-url.js';
import flattenImport from '../plugins/postcss-flatten-import.js';
import {CollapsifyError, CollapsifyOptions} from '../collapsify.js';

const logger = bole('collapsify:collapsers:css');

interface CssOptions extends CollapsifyOptions {
  imported?: boolean;
}

async function external(options: CssOptions) {
  const response = await options.fetch(options.resourceLocation);
  return collapse(await response.getAsString(), options);
}

async function collapse(bodyString: string, options: CssOptions) {
  try {
    const lazy = postcss()
      .use(flattenUrl(options))
      .use(flattenImport(options))
      .use(cssnano({preset: 'default'}))
      .process(bodyString, {from: options.resourceLocation});
    const result = await lazy;

    for (const message of result.warnings()) {
      logger.warn(message);
    }

    if (options.imported) {
      return result;
    }

    return result.css;
  } catch (error: unknown) {
    if (error instanceof CollapsifyError) {
      throw error;
    }

    logger.error(error);
    throw new CollapsifyError('Error during CSS inlining.');
  }
}

collapse.external = external;

export default collapse;
