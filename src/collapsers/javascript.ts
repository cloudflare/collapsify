import {minify} from 'terser';
import bole from 'bole';

const logger = bole('collapsify:collapsers:javascript');

async function external(options: any) {
  const response = await options.fetch(options.resourceLocation);
  return collapse(await response.getAsString(), options);
}

async function collapse(bodyString: string, options: any) {
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