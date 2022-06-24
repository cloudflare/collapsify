import {encodeSync} from '../utils/data-uri.js';

async function external({fetch, resourceLocation: url}: any) {
  const response = await fetch(url);
  const contentType = response.getContentType();
  return collapse(await response.getAsArray(), {contentType});
}

async function collapse(bodyArray: any, options: any) {
  return encodeSync(bodyArray, options);
}

collapse.external = external;

export default collapse;
