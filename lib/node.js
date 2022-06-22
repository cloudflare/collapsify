import httpClient from './utils/httpclient.js';
import collapseHTML from './collapsify.js';

export default function collapsifyNode(resourceLocation, options) {
  const fetch = httpClient(options.headers);

  options = Object.assign(
    {
      forbidden: 'a^',
    },
    options,
  );

  async function read(url) {
    const re = new RegExp(options.forbidden, 'i');

    if (re.test(url)) {
      throw new Error('Forbidden resource ' + url);
    }

    return fetch(url);
  }

  return collapseHTML({
    fetch: read,
    resourceLocation,
  });
}
