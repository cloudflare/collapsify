import {encodeSync} from '../utils/data-uri.js';

async function external({fetch, resourceLocation: url}) {
  const response = await fetch(url);
  const contentType = response.getContentType();
  return collapse(await response.getAsArray(), {contentType});
}

async function collapse(bodyArray, options) {
  return encodeSync(bodyArray, options);
}

collapse.external = external;

export default collapse;
