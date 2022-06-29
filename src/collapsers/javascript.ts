import {minify} from 'terser';
import bole from 'bole';
import {CollapsifyError, CollapsifyOptions} from '../collapsify.js';

const logger = bole('collapsify:collapsers:javascript');

async function external(options: CollapsifyOptions) {
  const response = await options.fetch(options.resourceLocation);
  return collapse(await response.getAsString(), options);
}

async function collapse(
  bodyString: string,
  options: {resourceLocation: string},
) {
  try {
    const result = await minify({
      [options.resourceLocation]: bodyString,
    });
    return result.code;
  } catch (error: unknown) {
    logger.error(error);
    return bodyString;
  }
}

collapse.external = external;

export default collapse;
