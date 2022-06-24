import postcss from 'postcss';
import cssnano from 'cssnano';
import bole from 'bole';
import flattenUrl from '../plugins/postcss-flatten-url.js';
import flattenImport from '../plugins/postcss-flatten-import.js';

const logger = bole('collapsify:collapsers:css');

async function external(options: any) {
  const response = await options.fetch(options.resourceLocation);
  return collapse(await response.getAsString(), options);
}

async function collapse(bodyString: string, options: any) {
  const lazy = (postcss as any)()
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
}

collapse.external = external;

export default collapse;